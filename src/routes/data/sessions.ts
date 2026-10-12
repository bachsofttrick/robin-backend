import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, practiceSessions } from "../../lib/db/index.js";
import { getUserId, signInRequired } from "../../lib/session.js";

const sessionColumns = {
  id: practiceSessions.id,
  scenario_id: practiceSessions.scenarioId,
  transcript: practiceSessions.transcript,
  debrief: practiceSessions.debrief,
  summary: practiceSessions.summary,
  started_at: practiceSessions.startedAt,
  ended_at: practiceSessions.endedAt,
};

type SessionContext = { params: Promise<{ id: string }> };

export async function sessionsPost(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const body = (await request.json()) as { scenario_id?: string | null };
  // Close any open session so each user has at most one continued session.
  await getDb()
    .update(practiceSessions)
    .set({ endedAt: sql`now()` })
    .where(and(eq(practiceSessions.userId, userId), isNull(practiceSessions.endedAt)));
  const rows = await getDb()
    .insert(practiceSessions)
    .values({ userId, scenarioId: body.scenario_id ?? null, transcript: [] })
    .returning({ id: practiceSessions.id });
  return Response.json(rows[0]);
}

export async function sessionsDelete(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  await getDb().delete(practiceSessions).where(eq(practiceSessions.userId, userId));
  return Response.json({ ok: true });
}

export async function sessionsOpenGet(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const rows = await getDb()
    .select(sessionColumns)
    .from(practiceSessions)
    .where(and(eq(practiceSessions.userId, userId), isNull(practiceSessions.endedAt)))
    .orderBy(desc(practiceSessions.startedAt))
    .limit(1);
  return Response.json(rows[0] ?? null);
}

export async function sessionsRecentGet(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const rows = await getDb()
    .select(sessionColumns)
    .from(practiceSessions)
    .where(and(eq(practiceSessions.userId, userId), isNotNull(practiceSessions.endedAt)))
    .orderBy(desc(practiceSessions.startedAt))
    .limit(5);
  return Response.json(rows);
}

export async function sessionGet(request: Request, { params }: SessionContext): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const { id } = await params;
  const rows = await getDb()
    .select(sessionColumns)
    .from(practiceSessions)
    .where(and(eq(practiceSessions.userId, userId), eq(practiceSessions.id, id)))
    .limit(1);
  if (!rows[0]) return Response.json({ error: "Session not found." }, { status: 404 });
  return Response.json(rows[0]);
}

export async function sessionPatch(request: Request, { params }: SessionContext): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const { id } = await params;
  const body = (await request.json()) as {
    transcript?: unknown;
    debrief?: unknown | null;
    summary?: string | null;
    ended_at?: string | null;
  };
  const where = and(eq(practiceSessions.userId, userId), eq(practiceSessions.id, id));

  const patch: Record<string, unknown> = {};
  if (body.transcript !== undefined) patch.transcript = body.transcript;
  if (body.debrief !== undefined) patch.debrief = body.debrief;
  if (body.summary !== undefined) patch.summary = body.summary;
  if (body.ended_at !== undefined) patch.endedAt = body.ended_at === null ? null : new Date(body.ended_at);

  if (Object.keys(patch).length === 0) {
    const rows = await getDb().select(sessionColumns).from(practiceSessions).where(where).limit(1);
    if (!rows[0]) return Response.json({ error: "Session not found." }, { status: 404 });
    return Response.json(rows[0]);
  }

  const rows = await getDb().update(practiceSessions).set(patch).where(where).returning(sessionColumns);
  if (!rows[0]) return Response.json({ error: "Session not found." }, { status: 404 });
  return Response.json(rows[0]);
}
