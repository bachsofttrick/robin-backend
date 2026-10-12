import { borelAiUrl } from "../../lib/env.js";
import { getUserIdOrNull } from "../../lib/session.js";
import { borelFetchWithTimeout } from "../../lib/ai/functions.js";
import {
  AI_SAYS,
  imageProxy,
  jsonBody,
  type AiImageResult,
} from "../../lib/ai/index.js";

export async function generationsPost(request: Request): Promise<Response> {
  const userId = await getUserIdOrNull(request);
  if (!userId) return Response.json({ error: "You need to sign in first." }, { status: 401 });
  try {
    if (!borelAiUrl()) return Response.json({ url: null, error: AI_SAYS.picture, status: 0, reason: null, reused: null } satisfies AiImageResult);
    const body = await jsonBody(request);
    return Response.json(await imageProxy(borelFetchWithTimeout, "/images/generations", { prompt: body.prompt, size: body.size }, AI_SAYS.picture, request.headers));
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return Response.json({ url: null, error: aborted ? AI_SAYS.pictureSlow : AI_SAYS.offline, status: 0, reason: null, reused: null } satisfies AiImageResult);
  }
}
