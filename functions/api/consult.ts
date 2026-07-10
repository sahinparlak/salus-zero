/// <reference types="@cloudflare/workers-types" />

// SALUS Zero — Section 2 endpoint: the decision-support COMPANION for a REAL
// child in front of the clinician. This is a deliberate FORK of turn.ts's
// Anthropic-streaming spine with every sim-specific part removed — no case, no
// clock, no vitals, no order log, no score, no hidden ground truth, and NO
// x-salus-state header. The two ~30-line stream helpers (mergeAlternating,
// anthropicSseToText) are COPIED here on purpose, not shared: turn.ts stays
// byte-for-byte the proven hero, and Section 2 stays independently droppable.
//
// Trust boundaries kept: (a) the API key is worker-only, (b) the surgeon
// reference is worker-only (injected in consultPrompt), (c) PHI is EPHEMERAL —
// the worker is stateless, writes to no store, and NEVER logs the request or
// intake body.

import { z } from "zod";
import {
  buildConsultSystemPrompt,
  intakeSummary,
  OPEN_GLUE,
} from "../lib/consultPrompt";

interface Env {
  ANTHROPIC_API_KEY?: string;
  MODEL_ID?: string;
}

// Patient intake. Age is hard-bounded 0–18 (locked decision: the prompt flags
// out-of-band ages as ungrounded rather than the schema rejecting them). All
// string fields are length-capped; arrays are capped — defensive, never a
// hard lock the UI can trip.
const IntakeSchema = z.object({
  name: z.string().trim().max(40).default(""),
  ageYears: z.number().int().min(0).max(18),
  sex: z.enum(["male", "female"]),
  complaint: z.string().trim().max(200).default(""),
  examFindings: z.array(z.string().trim().min(1).max(80)).max(24).default([]),
  resources: z.array(z.string().trim().min(1).max(60)).max(16).default([]),
  transferTimeMin: z.number().int().min(0).max(100000).nullable().default(null),
  clinicianRole: z.string().trim().max(40).default(""),
  clinicianName: z.string().trim().max(40).default(""),
});

const HistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});

const ConsultRequestSchema = z.object({
  // "open" = the auto-fired first grounded assessment; "reply" = a follow-up.
  intent: z.enum(["open", "reply"]).default("open"),
  intake: IntakeSchema,
  message: z.string().trim().min(1).max(2000).optional(),
  // Prior turns, client-held (the worker is stateless). Normalized into a
  // strictly alternating array below.
  history: z.array(HistoryMessageSchema).max(40).default([]),
});

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let parsed: z.infer<typeof ConsultRequestSchema>;
  try {
    parsed = ConsultRequestSchema.parse(await ctx.request.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  if (parsed.intent === "reply" && !parsed.message) {
    return new Response("message required for a reply", { status: 400 });
  }

  const system = buildConsultSystemPrompt();

  // The intake is re-prepended as the FIRST user message every turn (stateless
  // worker; record-over-transcript). On the opening turn the OPEN_GLUE asks for
  // the first grounded assessment; the follow-up message is appended last.
  // An OPENING has no history by definition — ignore any that was sent, so the
  // array can never end on a (possibly forged) assistant turn (review finding,
  // Day 1; turn.ts always ends free turns on a user message the same way).
  const summary = intakeSummary(parsed.intake);
  const messages =
    parsed.intent === "open"
      ? [{ role: "user" as const, content: summary + OPEN_GLUE }]
      : mergeAlternating([
          { role: "user" as const, content: summary },
          ...parsed.history,
          { role: "user" as const, content: parsed.message! },
        ]);

  // No x-salus-state header: the companion is stateless and holds no sim state.
  const headers = {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  };

  const apiKey = ctx.env.ANTHROPIC_API_KEY;

  // Keyless local fallback: stream a scoped, dose-free canned answer so the
  // whole flow is demoable offline without an Anthropic call.
  if (!apiKey) return streamMock(parsed.intent, headers);

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ctx.env.MODEL_ID || "claude-sonnet-5",
      // The full 6-move opening for a rich case runs long; 1800 truncated
      // before the prototype/"verify, you decide" close (curl checkpoint,
      // Day 1). Headroom so the safety close always lands. (Verbosity of the
      // opening is a Day-3 prompt-tuning item, not a ceiling problem.)
      // Sized to the prompt's word budgets (~350-word opening, ~120-word
      // follow-ups) with generous margin — small enough to backstop verbosity.
      max_tokens: 1400,
      stream: true,
      // Grounding comes from the reference, not from long deliberation — keep
      // thinking off for the fastest first token. On Sonnet 5, omitting
      // `thinking` would silently run adaptive and add latency.
      thinking: { type: "disabled" },
      system,
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    // PHI SAFETY: log ONLY the status — never the request/intake body, and not
    // the upstream error body (which could echo request content back). This is
    // a deliberate divergence from turn.ts, which logs the body for debugging.
    console.error(`consult upstream ${upstream.status}`);
    return new Response("the companion is unreachable — try again", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(anthropicSseToText(upstream.body), { headers });
};

// ── Copied verbatim from turn.ts (kept local so the hero is untouched) ──────

// Anthropic requires strictly alternating user/assistant messages starting
// with user. Client history is untrusted — consecutive same-role entries are
// merged, and a leading assistant entry is absorbed by the prepended intake.
function mergeAlternating(
  entries: { role: "user" | "assistant"; content: string }[],
): { role: "user" | "assistant"; content: string }[] {
  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const entry of entries) {
    const last = merged[merged.length - 1];
    if (last && last.role === entry.role) {
      last.content += `\n\n${entry.content}`;
    } else {
      merged.push({ ...entry });
    }
  }
  return merged;
}

// Parse Anthropic's SSE and re-emit only the text deltas as a plain-text
// stream — no SSE or JSON parsing on the client. thinking/ping/message events
// are swallowed, so even if thinking were enabled it could never leak to text.
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

// Keyless offline fallback. Scoped and DOSE-FREE by construction — it must obey
// the same safety posture as the live prompt. (Plan §9 #7: Şahin to finalize
// the canned wording.)
function streamMock(
  intent: "open" | "reply",
  headers: Record<string, string>,
): Response {
  const encoder = new TextEncoder();
  const text =
    intent === "open"
      ? "Reading you back: a child with a possible acute abdomen. Before " +
        "anchoring on appendicitis, keep the age-appropriate mimics alive — " +
        "testicular torsion in a boy (examine the scrotum), intussusception " +
        "and malrotation/volvulus in a young child, DKA (a bedside glucose + " +
        "ketones is your cheapest life-saving test), and mesenteric adenitis. " +
        "Red flags to exclude now: rigidity, rebound in all quadrants, a toxic " +
        "look, a rising heart rate with a falling blood pressure. With no CT or " +
        "ultrasound, commit on clinical grounds and start the referral early — " +
        "the safe error here is over-referral. This is prototype help — verify, " +
        "you decide. (Local mock — add your API key to .dev.vars to stream the " +
        "real companion.)"
      : "I'll keep this grounded in the reference and to the child's intake, and " +
        "I'll keep the still-open mimics on the table until you've cleared them. " +
        "Verify, you decide. (Local mock — add your API key to .dev.vars for the " +
        "real companion.)";
  const words = text.split(" ");
  const stream = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(w + " "));
        await new Promise((r) => setTimeout(r, 35));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers });
}
