// Best-effort denial-of-wallet brake for the three unauthenticated /api
// endpoints. Every request costs real Anthropic tokens, so a dumb loop from
// one address must hit a wall before it hits the wallet.
//
// Scope, honestly stated: the state is per-isolate memory — Cloudflare may
// run many isolates across colos, and an isolate restart forgets everything.
// That still stops the naive `while true; do curl; done` case (one source
// lands on one colo), but a distributed abuser walks past it: the real belt
// is an edge WAF rate-limit rule on /api/* (dashboard), which this code
// deliberately does not try to replace.

const WINDOW_MS = 60_000;

// scope:requester -> request timestamps inside the current window. All three
// endpoints share this module instance in the Pages worker bundle, so the
// scope MUST be part of the key: without it a night of /api/turn calls
// would eat the debrief's tighter budget and 429 the one legitimate
// debrief at the finish line (caught by the section-B curl verification).
const buckets = new Map<string, number[]>();

// True when this request pushes the caller past `limit` per minute for this
// scope. The refused request is NOT counted — a client that backs off
// recovers after one quiet window instead of re-arming its own block forever.
export function rateLimited(
  request: Request,
  limit: number,
  scope: string,
): boolean {
  // Behind Cloudflare this header is always the real client address; the
  // fallback only exists for local `wrangler pages dev`.
  const key = `${scope}:${request.headers.get("cf-connecting-ip") ?? "local"}`;
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  // An address-spray must not grow the map without bound; forgetting
  // everyone occasionally is fine for a best-effort brake.
  if (buckets.size > 10_000) buckets.clear();
  return false;
}

export function tooManyRequests(): Response {
  return new Response("Too many requests from this address — slow down.", {
    status: 429,
    headers: { "content-type": "text/plain; charset=utf-8", "retry-after": "60" },
  });
}
