/// <reference types="@cloudflare/workers-types" />

// The debrief endpoint — the ONE structured-output call of the product.
// Fires only when the case is over (referral committed or clock ceiling).
// The worker computes the deterministic score in code, hands the model the
// verified record + transcript, and merges the model's teaching prose with
// the code-owned number and the authored ctContrastText. This is the only
// place the ground truth is allowed to cross the trust boundary — and only
// after the case has ended.
//
// Trust note (same accepted residual as /api/turn): the end-of-case check
// runs on client-supplied state, so a forged payload can pull the debrief
// early — that spoils the forger's own game and nothing else; the diagnosis
// is no longer a secret once the debrief is legitimately reachable.

import { z } from "zod";
import { DEFAULT_CASE_ID, getCase } from "../cases";
import {
  buildDebriefUserMessage,
  DEBRIEF_OUTPUT_SCHEMA,
  DEBRIEF_SYSTEM_PROMPT,
  type DebriefModelOutput,
} from "../lib/debriefPrompt";
import { OrderedEntrySchema } from "../lib/loop";
import { rateLimited, tooManyRequests } from "../lib/rateLimit";
import { computeScore, type ScoreResult } from "../lib/score";
import { clampClock, maxClockOf } from "../lib/stage";

interface Env {
  ANTHROPIC_API_KEY?: string;
  MODEL_ID?: string;
}

// Sized to a real night, not to the theoretical maximum: a world beat is
// ~160 words and a player entry is capped typed text + the composed system
// bracket, so no legitimate single entry approaches 3000 chars — and a
// played-to-the-end night stays well under 80 entries. Anything bigger is
// someone feeding the expensive call a synthetic transcript (this is the
// costliest endpoint: 12k max_tokens, adaptive thinking, up to 2 attempts).
const HistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(3000),
});

const DebriefRequestSchema = z.object({
  caseId: z.string().default(DEFAULT_CASE_ID),
  elapsedMin: z.number().finite(),
  orderedLog: z.array(OrderedEntrySchema).max(1000).default([]),
  referralStartedAtMin: z.number().finite().nullable().default(null),
  // The whole night this time (vs the sliding window of /api/turn) — the
  // attending reads everything. Still hard-capped against abuse.
  history: z.array(HistoryMessageSchema).max(80).default([]),
});

const DebriefModelOutputSchema = z.object({
  groundTruthReveal: z.string().min(1),
  strengths: z.array(z.string().min(1)).max(6),
  misses: z.array(z.string().min(1)).max(6),
  resourceLesson: z.string().min(1),
});

// Decode-artifact gate for the money shot. Observed twice in live play (both
// times in the final schema field): a stuttered word ("…cost.on on on the
// pathway…"), a period-glued fragment ("suspicion.this is…"), a truncated
// trailing token ("…not after it.eq"). One retry when a signature matches;
// the second attempt is served regardless — the gate must never block.
const ABBREVIATIONS = new Set(["a.m", "p.m", "e.g", "i.e", "etc", "vs", "dr", "st"]);

// Exported for the (uncommitted) test battery only.
export function looksGarbled(out: DebriefModelOutput): boolean {
  const texts = [
    out.groundTruthReveal,
    out.resourceLesson,
    ...out.strengths,
    ...out.misses,
  ];
  for (const t of texts) {
    // The same word three or more times in a row ("on on on").
    if (/\b(\w+)( \1){2,}\b/i.test(t)) return true;
    // Trailing junk after the final sentence terminal ("…after it.eq").
    const tail = /[.!?]["']?([a-z]{1,4})$/.exec(t.trim());
    if (tail && !ABBREVIATIONS.has(tail[1])) return true;
    // A period glued to the next word ("suspicion.this") — skip short
    // left-hand words so "a.m." and friends never trip it.
    for (const m of t.matchAll(/([A-Za-z]{4,})\.([a-z]{3,})/g)) {
      if (!ABBREVIATIONS.has(m[2])) return true;
    }
  }
  return false;
}

function debriefResponse(
  spec: NonNullable<ReturnType<typeof getCase>>,
  result: ScoreResult,
  model: DebriefModelOutput,
): Response {
  return Response.json({
    score: result.score,
    axes: result.axes,
    endReason: result.signals.endReason,
    referralStartedAtMin: result.signals.referralStartedAtMin,
    referTargetByMin: result.signals.referTargetByMin,
    finalStageId: result.signals.finalStageId,
    groundTruthReveal: model.groundTruthReveal,
    strengths: model.strengths,
    misses: model.misses,
    resourceLesson: model.resourceLesson,
    // Code-owned: the authored Profile-B contrast, served verbatim. It lives
    // worker-side and reaches the client only inside this response.
    ctContrast: spec.debrief.ctContrastText,
  });
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  // The most expensive call in the product, and a legitimate player needs
  // exactly ONE per night (the UI retry stays comfortable inside 3/min).
  if (rateLimited(ctx.request, 3, "debrief")) return tooManyRequests();

  let parsed: z.infer<typeof DebriefRequestSchema>;
  try {
    parsed = DebriefRequestSchema.parse(await ctx.request.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const spec = getCase(parsed.caseId);
  if (!spec) return new Response("Unknown case", { status: 404 });

  const maxClock = maxClockOf(spec);
  const elapsed = clampClock(parsed.elapsedMin, maxClock);
  if (parsed.referralStartedAtMin === null && elapsed < maxClock) {
    return new Response("The case is not over yet", { status: 409 });
  }

  // Same sanitation as /api/turn: catalog-validated ids only (a forged id
  // must never reach the score or the debrief prompt), FIRST 200 entries —
  // the earliest orders carry the differential credit and the referral
  // decision minute (a legitimate night can't reach 200 anyway).
  const catalogIds = new Set(spec.actionCatalog.map((a) => a.id));
  const safeLog = parsed.orderedLog
    .filter((e) => catalogIds.has(e.id))
    .slice(0, 200)
    .map((e) => ({ id: e.id, atMin: clampClock(e.atMin, elapsed) }));
  const referralStartedAtMin =
    parsed.referralStartedAtMin === null
      ? null
      : clampClock(parsed.referralStartedAtMin, elapsed);

  const result = computeScore(spec, {
    elapsedMin: elapsed,
    orderedLog: safeLog,
    referralStartedAtMin,
  });

  const transcript = parsed.history
    .map((m) => `${m.role === "assistant" ? "WORLD" : "DOCTOR"}: ${m.content}`)
    .join("\n\n");
  const userMessage = buildDebriefUserMessage(spec, result, transcript);

  const apiKey = ctx.env.ANTHROPIC_API_KEY;
  if (!apiKey) return debriefResponse(spec, result, mockDebrief(result));

  // Non-streaming, thinking adaptive, effort high: the debrief is allowed to
  // take its time — the UI covers the wait, and for the video it can be
  // prerecorded. Structured output guarantees parseable JSON on success.
  // Up to TWO attempts: a decode-artifact signature (looksGarbled) or a
  // malformed body triggers one retry; whatever the second attempt yields is
  // served, and a garbled-but-parsed first attempt is still better than a
  // 502 if the retry itself fails.
  let model: DebriefModelOutput | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    // A thrown fetch (DNS/TLS/connection reset) gets the same treatment as
    // a non-ok status below — without the catch it would surface as
    // Cloudflare's raw 1101 error page instead of the client's retry UI.
    let upstream: Response;
    try {
      upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ctx.env.MODEL_ID || "claude-sonnet-5",
          max_tokens: 12000,
          thinking: { type: "adaptive" },
          output_config: {
            effort: "high",
            format: { type: "json_schema", schema: DEBRIEF_OUTPUT_SCHEMA },
          },
          system: DEBRIEF_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });
    } catch (err) {
      console.error(`debrief upstream fetch failed: ${(err as Error).message}`);
      if (model) break; // serve the garbled-but-whole first attempt
      return new Response("The attending could not be reached — try again", {
        status: 502,
      });
    }

    if (!upstream.ok) {
      // Detail goes to the worker log only — raw upstream error bodies are
      // not for the player-facing UI.
      console.error(
        `debrief upstream ${upstream.status}: ${await upstream.text().catch(() => "")}`,
      );
      if (model) break; // serve the garbled-but-whole first attempt
      return new Response("The attending could not be reached — try again", {
        status: 502,
      });
    }

    try {
      const msg = (await upstream.json()) as {
        stop_reason?: string;
        content?: { type: string; text?: string }[];
      };
      if (msg.stop_reason === "refusal") {
        return new Response("The debrief model declined the request", {
          status: 502,
        });
      }
      const text = msg.content?.find((b) => b.type === "text")?.text;
      if (!text) throw new Error("no text block");
      const parsed = DebriefModelOutputSchema.parse(JSON.parse(text));
      model = parsed;
      if (!looksGarbled(parsed)) break;
      console.error(`debrief attempt ${attempt + 1}: artifact signature detected`);
    } catch {
      // max_tokens truncation or malformed output — retry once, then surface
      // it; the client offers a retry rather than rendering a half-debrief.
      console.error(`debrief attempt ${attempt + 1}: malformed output`);
    }
  }

  if (!model) {
    return new Response("The debrief came back malformed — try again", {
      status: 502,
    });
  }

  return debriefResponse(spec, result, model);
};

// Keyless local fallback: the reveal UI stays fully developable offline. The
// prose is canned; the score and breakdown are the real computed ones.
function mockDebrief(result: ScoreResult): DebriefModelOutput {
  const referred = result.signals.endReason === "referral";
  return {
    groundTruthReveal:
      "(Local mock — add your API key to .dev.vars for the real attending.) " +
      "The hidden diagnosis would be revealed here, with where the night " +
      "truly stood when it was decided.",
    strengths: [
      referred
        ? `You committed to transfer at minute ${Math.round(result.signals.referralStartedAtMin ?? 0)} — the record shows the chain was started.`
        : "You stayed at the bedside through the night.",
      "The real debrief cites your actual orders and minutes here.",
    ],
    misses: [
      "The real debrief names the subtle, consequential misses here — the " +
        "kind a checklist would mark correct.",
    ],
    resourceLesson:
      "The real debrief ties your play to the scarcity lesson here: what " +
      "set the tempo of the night, and what the clock bought or lost.",
  };
}
