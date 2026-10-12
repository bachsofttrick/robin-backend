import { PRIVACY_POLICY_HTML, TERMS_OF_SERVICE_HTML } from "./legal-pages.js";

function htmlPage(body: string): Response {
  return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export function privacyPolicyGet(): Response {
  return htmlPage(PRIVACY_POLICY_HTML);
}

export function termsOfServiceGet(): Response {
  return htmlPage(TERMS_OF_SERVICE_HTML);
}
