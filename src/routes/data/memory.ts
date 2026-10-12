import { desc, eq } from "drizzle-orm";
import { getDb, robinMemory } from "../../lib/db/index.js";
import { getUserId, signInRequired } from "../../lib/session.js";

const memoryColumns = {
  id: robinMemory.id,
  kind: robinMemory.kind,
  content: robinMemory.content,
};

export async function memoryGet(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const rows = await getDb()
    .select(memoryColumns)
    .from(robinMemory)
    .where(eq(robinMemory.userId, userId))
    .orderBy(desc(robinMemory.createdAt))
    .limit(40);
  return Response.json(rows);
}

export async function memoryPost(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const body = (await request.json()) as { kind?: string | null; content?: string | null };
  const rows = await getDb()
    .insert(robinMemory)
    .values({ userId, kind: body.kind ?? null, content: body.content ?? null })
    .returning({ id: robinMemory.id });
  return Response.json(rows[0]);
}

export async function memoryDelete(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  await getDb().delete(robinMemory).where(eq(robinMemory.userId, userId));
  return Response.json({ ok: true });
}
