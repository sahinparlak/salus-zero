/// <reference types="@cloudflare/workers-types" />

// The trust boundary. The API key lives ONLY here (a Cloudflare secret) and
// never reaches the browser. Day 0's single job: prove the full streaming pipe
// browser -> Worker -> Anthropic -> SSE -> browser, as smooth plain text.

interface Env {
  ANTHROPIC_API_KEY?: string;
  MODEL_ID?: string;
}

const SYSTEM_PROMPT =
  "You are the world engine of SALUS Zero, a clinical TRAINING simulation for " +
  "doctors — never advice for a real patient. Produce only plain narrative " +
  "text: play the world, be vivid, and stay concise.";

const DEFAULT_PROMPT =
  "Confirm in two sentences that the streaming pipe is alive.";

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let prompt = DEFAULT_PROMPT;
  try {
    const body = await ctx.request.json<{ prompt?: string }>();
    if (body?.prompt?.trim()) prompt = body.prompt;
  } catch {
    /* fall back to the default prompt */
  }

  const apiKey = ctx.env.ANTHROPIC_API_KEY;

  // Day 0 fallback: with no key we still stream, so the transport can be
  // verified end-to-end before the real Anthropic call is wired up.
  if (!apiKey) return streamMock();

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ctx.env.MODEL_ID || "claude-sonnet-5",
      max_tokens: 1024,
      stream: true,
      // Turn calls narrate fast: keep thinking off. On Sonnet 5, omitting
      // `thinking` would silently run adaptive and add latency.
      thinking: { type: "disabled" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response(`Upstream error ${upstream.status}: ${detail}`, {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(anthropicSseToText(upstream.body), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};

// Parse Anthropic's SSE and re-emit only the text deltas as a plain-text
// stream — no SSE or JSON parsing needed on the client.
function anthropicSseToText(
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            for (const line of frame.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (!data) continue;
              try {
                const evt = JSON.parse(data) as {
                  type?: string;
                  delta?: { type?: string; text?: string };
                };
                if (
                  evt.type === "content_block_delta" &&
                  evt.delta?.type === "text_delta" &&
                  evt.delta.text
                ) {
                  controller.enqueue(encoder.encode(evt.delta.text));
                }
              } catch {
                /* ignore keep-alive pings and non-JSON lines */
              }
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

function streamMock(): Response {
  const encoder = new TextEncoder();
  const words = (
    "SALUS Zero — the streaming pipe is alive. No API key is set yet, so this " +
    "is a local mock. Add your key to .dev.vars to stream from Claude."
  ).split(" ");
  const stream = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(w + " "));
        await new Promise((r) => setTimeout(r, 45));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
