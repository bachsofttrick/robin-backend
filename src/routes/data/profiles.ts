import { getDb, profiles } from "../../lib/db/index.js";
import { getUserId, signInRequired } from "../../lib/session.js";

const fullProfileColumns = {
  id: profiles.id,
  email: profiles.email,
  display_name: profiles.displayName,
  avatar_url: profiles.avatarUrl,
  updated_at: profiles.updatedAt,
};

export async function profilesPut(request: Request): Promise<Response> {
  const userId = await getUserId(request);
  if (!userId) return signInRequired();
  const body = (await request.json()) as {
    email?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  };
  const values = {
    email: body.email ?? null,
    displayName: body.display_name ?? null,
    avatarUrl: body.avatar_url ?? null,
    updatedAt: new Date(),
  };
  const rows = await getDb()
    .insert(profiles)
    .values({ id: userId, ...values })
    .onConflictDoUpdate({ target: profiles.id, set: values })
    .returning(fullProfileColumns);
  return Response.json(rows[0]);
}
