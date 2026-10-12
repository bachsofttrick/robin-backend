import { eq } from "drizzle-orm";
import { getDb, learnerProfiles } from "../../lib/db/index.js";
import { getUserId, signInRequired } from "../../lib/session.js";

const profileColumns = {
  display_name: learnerProfiles.displayName,
  level: learnerProfiles.level,
};

export async function profileGet(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const rows = await getDb()
    .select(profileColumns)
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, userId))
    .limit(1);
  return Response.json(rows[0] ?? null);
}

export async function profilePut(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const body = (await request.json()) as { display_name?: string | null; level?: string | null };
  const values = { displayName: body.display_name ?? null, level: body.level ?? null };
  const rows = await getDb()
    .insert(learnerProfiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: learnerProfiles.userId, set: values })
    .returning(profileColumns);
  return Response.json(rows[0]);
}
