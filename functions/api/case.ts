/// <reference types="@cloudflare/workers-types" />

// Serves the PUBLIC projection of a case: vignette, patient, constraint board,
// opening vitals. The secret half (stages, ground truth, scoring) never leaves
// the worker — see toPublicCase().

import { DEFAULT_CASE_ID, getCase } from "../cases";
import { toPublicCase } from "../lib/caseSpec";

export const onRequestGet: PagesFunction = async (ctx) => {
  const id =
    new URL(ctx.request.url).searchParams.get("id") ?? DEFAULT_CASE_ID;
  const spec = getCase(id);
  if (!spec) {
    return new Response("Unknown case", { status: 404 });
  }
  return Response.json(toPublicCase(spec), {
    headers: { "cache-control": "no-store" },
  });
};
