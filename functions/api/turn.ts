/// <reference types="@cloudflare/workers-types" />

// The trust boundary. The API key lives ONLY here (a Cloudflare secret) and
// never reaches the browser. As of Day 1 this is the world-engine call: the
// worker owns the secret case-spec, computes the deterministic stage, builds
// the system prompt, and streams Claude's plain-text narration back.

import { z } from "zod";
import { DEFAULT_CASE_ID, getCase } from "../cases";
import { buildSystemPrompt, OPENING_INSTRUCTION } from "../lib/prompt";
import { clampClock, maxClockOf, stageOf } from "../lib/stage";

interface Env {
  ANTHROPIC_API_KEY?: string;
  MODEL_ID?: string;
}

const TurnRequestSchema = z.object({
  caseId: z.string().default(DEFAULT_CASE_ID),
  // Sim-minutes elapsed so far. The CLIENT displays the clock but the WORKER
  // owns the physiology: elapsed -> stage -> vitals, deterministically.
  elapsedMin: z.number().finite().default(0),
  // "present" = the case-opening narration; "free" = a free-text player turn
  // (the Day 2 core loop will build on this).
  intent: z.enum(["present", "free"]).default("present"),
  playerInput: z.string().trim().min(1).max(2000).optional(),
  // Action ids the player has actually ordered — the worker only hands the
  // model lab strings for these (lab gating lives in code, not the prompt).
  orderedActions: z.array(z.string()).max(50).default([]),
  referralStartedAtMin: z.number().finite().nullable().default(null),
});

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let parsed: z.infer<typeof TurnRequestSchema>;
  try {
    parsed = TurnRequestSchema.parse(await ctx.request.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const spec = getCase(parsed.caseId);
  if (!spec) return new Response("Unknown case", { status: 404 });

  if (parsed.intent === "free" && !parsed.playerInput) {
    return new Response("playerInput required for a free turn", {
      status: 400,
    });
  }

  const elapsed = clampClock(parsed.elapsedMin, maxClockOf(spec));
  const stage = stageOf(spec, elapsed);
  const system = buildSystemPrompt(
    spec,
    stage,
    elapsed,
    parsed.intent === "present" ? [] : parsed.orderedActions,
    parsed.referralStartedAtMin,
  );
  const userMessage =
    parsed.intent === "present" ? OPENING_INSTRUCTION : parsed.playerInput!;

  const apiKey = ctx.env.ANTHROPIC_API_KEY;

  // Keyless local fallback: still stream, so the transport and UI can be
  // exercised end-to-end without a real Anthropic call.
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
      system,
      messages: [{ role: "user", content: userMessage }],
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
    "The ward is quiet except for a fan turning somewhere down the corridor. " +
    "A nurse waves you over: a mother stands by the stretcher, a boy curled " +
    "on his side under a blanket. (Local mock — add your API key to " +
    ".dev.vars to stream the real world engine.)"
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
