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
import { computeScore, type ScoreResult } from "../lib/score";
import { clampClock, maxClockOf } from "../lib/stage";

interface Env {
  ANTHROPIC_API_KEY?: string;
  MODEL_ID?: string;
}

const HistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});

const DebriefRequestSchema = z.object({
  caseId: z.string().default(DEFAULT_CASE_ID),
  elapsedMin: z.number().finite(),
  orderedLog: z.array(OrderedEntrySchema).max(1000).default([]),
  referralStartedAtMin: z.number().finite().nullable().default(null),
  // The whole night this time (vs the sliding window of /api/turn) — the
  // attending reads everything. Still hard-capped against abuse.
  history: z.array(HistoryMessageSchema).max(120).default([]),
});

const DebriefModelOutputSchema = z.object({
  groundTruthReveal: z.string().min(1),
  strengths: z.array(z.string().min(1)).max(6),
  misses: z.array(z.string().min(1)).max(6),
  resourceLesson: z.string().min(1),
});

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

  // Same sanitation as /api/turn, but keep the FIRST 200 entries: the
  // earliest orders carry the differential credit and the referral decision
  // minute (a legitimate night can't reach 200 anyway — this is anti-abuse).
  const safeLog = parsed.orderedLog
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
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
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

  if (!upstream.ok) {
    // Detail goes to the worker log only — raw upstream error bodies are not
    // for the player-facing UI.
    console.error(
      `debrief upstream ${upstream.status}: ${await upstream.text().catch(() => "")}`,
    );
    return new Response("The attending could not be reached — try again", {
      status: 502,
    });
  }

  let model: DebriefModelOutput;
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
    model = DebriefModelOutputSchema.parse(JSON.parse(text));
  } catch {
    // max_tokens truncation or malformed output — surface it; the client
    // offers a retry rather than rendering a half-debrief.
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
