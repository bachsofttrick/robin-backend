import { auth } from "./auth.js";

export const SIGN_IN_ERROR = { error: "You need to sign in first." };

/** The 401 every gated route answers a signed-out caller with. */
export function signInRequired(): Response {
  return Response.json(SIGN_IN_ERROR, { status: 401 });
}

/** The signed-in user's id, or null when signed out. Lookup failures pass through. */
export async function getUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

/** The signed-in user's id, or null when signed out or the session store cannot answer. */
export async function getUserIdOrNull(request: Request): Promise<string | null> {
  try {
    return await getUserId(request);
  } catch {
    // A session lookup that cannot run leaves the caller signed out.
    return null;
  }
}
