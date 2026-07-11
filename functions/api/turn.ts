/// <reference types="@cloudflare/workers-types" />

// The trust boundary. The API key lives ONLY here (a Cloudflare secret) and
// never reaches the browser. As of Day 2 this is the full core-loop call: the
// worker resolves the turn (clock advance, order log, referral, end-of-case),
// computes the deterministic stage, builds the system prompt, streams Claude's
// plain-text narration back, and hands the client the new sim state in the
// X-Salus-State response header. The client displays; the worker owns.

import { z } from "zod";
import { DEFAULT_CASE_ID, getCase } from "../cases";
import {
  OrderedEntrySchema,
  resolveTurn,
  type TurnResolution,
} from "../lib/loop";
import {
  buildSystemPrompt,
  composeTurnMessage,
  OPENING_INSTRUCTION,
} from "../lib/prompt";
import { rateLimited, tooManyRequests } from "../lib/rateLimit";
import { clampClock, maxClockOf, stageOf, vitalsAt } from "../lib/stage";

interface Env {
  ANTHROPIC_API_KEY?: string;
  MODEL_ID?: string;
}

const HistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});

const TurnRequestSchema = z.object({
  caseId: z.string().default(DEFAULT_CASE_ID),
  // "present" = the case-opening narration; "free" = a player turn.
  intent: z.enum(["present", "free"]).default("present"),
  playerInput: z.string().trim().min(1).max(2000).optional(),
  // Quick-action buttons clicked this turn (validated against the catalog).
  clickedActions: z.array(z.string()).max(8).default([]),
  // Sim-minutes elapsed BEFORE this turn. The client displays the clock but
  // the WORKER advances it — elapsed -> stage -> vitals, deterministically.
  elapsedMin: z.number().finite().default(0),
  // Every completed order so far, with the minute its sample was taken.
  // Generous cap + server-side truncation below — never a hard 400 lock.
  orderedLog: z.array(OrderedEntrySchema).max(1000).default([]),
  referralStartedAtMin: z.number().finite().nullable().default(null),
  // Prior narration, client-held (the worker is stateless). Roles are
  // normalized into a strictly alternating Anthropic messages array below.
  history: z.array(HistoryMessageSchema).max(40).default([]),
});

// Everything the browser needs after a turn: authoritative clock, the vitals
// the bedside monitor shows NOW, and what the turn registered. Current values
// only — future stages, ground truth and scoring never leave the worker.
// vitalsAt drifts within a stage (code-owned, deterministic), so the monitor
// is alive on every turn — and the prompt uses the same function, so the
// model narrates exactly what the screen shows.
function stateHeader(spec: Parameters<typeof stageOf>[0], res: TurnResolution) {
  const json = JSON.stringify({
    elapsedMin: res.elapsedMin,
    turnCostMin: res.turnCostMin,
    registeredActions: res.turnActions,
    attemptedActions: res.attemptedActions,
    vitals: vitalsAt(spec, res.elapsedMin),
    orderedLog: res.orderedLog,
    referralStartedAtMin: res.referralStartedAtMin,
    pendingReferral: res.pendingReferral,
    caseOver: res.caseOver,
    endReason: res.endReason,
  });
  // HTTP header values are latin-1: the refusal reasons carry em-dashes
  // (and future cases may carry Turkish), which would reach the client as
  // mojibake and split the history mirror from the worker's text. \uXXXX
  // escapes survive any header transport and JSON.parse restores them.
  return json.replace(
    /[\u007f-\uffff]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  // A real turn takes tens of seconds to read and answer; 10/min/address is
  // far above any human play and far below a wallet-drain loop.
  if (rateLimited(ctx.request, 10)) return tooManyRequests();

  let parsed: z.infer<typeof TurnRequestSchema>;
  try {
    parsed = TurnRequestSchema.parse(await ctx.request.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const spec = getCase(parsed.caseId);
  if (!spec) return new Response("Unknown case", { status: 404 });

  let resolution: TurnResolution;
  let userMessage: string;

  if (parsed.intent === "present") {
    // Opening the case costs nothing: the arrival scene IS minute zero.
    resolution = {
      turnActions: [],
      attemptedActions: [],
      turnCostMin: 0,
      elapsedMin: 0,
      orderedLog: [],
      referralStartedAtMin: null,
      pendingReferral: false,
      caseOver: false,
      endReason: null,
    };
    userMessage = OPENING_INSTRUCTION;
  } else {
    if (!parsed.playerInput && parsed.clickedActions.length === 0) {
      return new Response("playerInput or clickedActions required", {
        status: 400,
      });
    }
    // The case is over once referral is initiated or the clock ceiling hit —
    // further turns belong to the debrief system (Day 3), not the world.
    const clamped = clampClock(parsed.elapsedMin, maxClockOf(spec));
    if (parsed.referralStartedAtMin !== null || clamped >= maxClockOf(spec)) {
      return new Response("The case has already ended", { status: 409 });
    }
    // Sanitize the client-held log: drop ids the case never issued (the
    // same catalog check clickedActions gets — a forged "__proto__" or junk
    // id must never reach the prompt or the score), cap the size (never a
    // hard lock) and clamp every sample time to the current clock — a
    // forged future atMin would otherwise pull future-stage lab strings
    // into the prompt. Keep the OLDEST entries, matching debrief.ts: the
    // earliest orders carry the differential credit and the referral
    // decision minute, and the client replaces its log with this one every
    // turn — a keep-newest window here would slowly evict them on a spam
    // night and make the blind-commit check fire against a play that did
    // examine.
    const catalogIds = new Set(spec.actionCatalog.map((a) => a.id));
    const safeLog = parsed.orderedLog
      .filter((e) => catalogIds.has(e.id))
      .slice(0, 200)
      .map((e) => ({ id: e.id, atMin: clampClock(e.atMin, clamped) }));
    resolution = resolveTurn(spec, {
      elapsedMin: clamped,
      clickedActions: parsed.clickedActions,
      playerInput: parsed.playerInput,
      orderedLog: safeLog,
      referralStartedAtMin: parsed.referralStartedAtMin,
    });
    userMessage = composeTurnMessage(
      parsed.playerInput,
      resolution.turnActions,
      resolution.attemptedActions,
      resolution.turnCostMin,
    );
  }

  const stage = stageOf(spec, resolution.elapsedMin);
  const system = buildSystemPrompt(
    spec,
    stage,
    resolution.elapsedMin,
    resolution.orderedLog,
    resolution.referralStartedAtMin,
    // On the case-ending turn the world must CLOSE the scene instead of
    // inviting a next move — the rule lives in the system prompt so the
    // in-world-noise defenses don't fight it.
    resolution.endReason,
    // Voiced-but-uncommitted transfer: the status line tells the model to
    // narrate deliberation only, never an initiated call.
    resolution.pendingReferral,
  );

  // The opening instruction is re-prepended on every turn so the transcript
  // the model sees starts the same way it was generated, and the array stays
  // strictly user/assistant-alternating regardless of client input. On the
  // opening turn itself the instruction IS the message — no prepend, or the
  // model would receive it twice and later replays would diverge from turn 1.
  const messages =
    parsed.intent === "present"
      ? [{ role: "user" as const, content: OPENING_INSTRUCTION }]
      : mergeAlternating([
          { role: "user" as const, content: OPENING_INSTRUCTION },
          ...parsed.history,
          { role: "user" as const, content: userMessage },
        ]);

  const headers = {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-salus-state": stateHeader(spec, resolution),
  };

  const apiKey = ctx.env.ANTHROPIC_API_KEY;

  // Keyless local fallback: still stream AND still return real sim state, so
  // the whole loop is playable end-to-end without an Anthropic call.
  if (!apiKey) return streamMock(parsed.intent, resolution, headers);

  // A thrown fetch (DNS/TLS/connection reset) would otherwise surface as
  // Cloudflare's raw 1101 error page — return the same in-world 502 the
  // non-ok branch already uses.
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
        max_tokens: 1024,
        stream: true,
        // Turn calls narrate fast: keep thinking off. On Sonnet 5, omitting
        // `thinking` would silently run adaptive and add latency.
        thinking: { type: "disabled" },
        system,
        messages,
      }),
    });
  } catch (err) {
    console.error(`turn upstream fetch failed: ${(err as Error).message}`);
    return new Response("the world engine is unreachable — try the turn again", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    // Detail goes to the worker log only — raw upstream error bodies are not
    // for the player-facing UI (App.tsx renders this text verbatim).
    console.error(
      `turn upstream ${upstream.status}: ${await upstream.text().catch(() => "")}`,
    );
    return new Response("the world engine is unreachable — try the turn again", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(anthropicSseToText(upstream.body), { headers });
};

// Anthropic requires strictly alternating user/assistant messages starting
// with user. Client history is untrusted — consecutive same-role entries are
// merged, and a leading assistant entry is absorbed by the prepended opener.
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
// stream — no SSE or JSON parsing needed on the client. A mid-stream `error`
// event, a max_tokens truncation or a dropped upstream read used to be
// swallowed silently — the narration just stopped and read as complete. All
// three now ERROR the relay stream, which aborts the response body
// mid-transfer: the client's reader throws and its existing error/retry
// paths take over (the turn UI appends its connection note and re-enables
// the composer).
// NOTE: consult.ts carries a deliberate copy of this — change both together.
function anthropicSseToText(
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = "";
      let failure: string | null = null;
      try {
        relay: for (;;) {
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
                  delta?: { type?: string; text?: string; stop_reason?: string };
                };
                if (
                  evt.type === "content_block_delta" &&
                  evt.delta?.type === "text_delta" &&
                  evt.delta.text
                ) {
                  controller.enqueue(encoder.encode(evt.delta.text));
                } else if (evt.type === "error") {
                  failure = "upstream mid-stream error event";
                  break relay;
                } else if (
                  evt.type === "message_delta" &&
                  evt.delta?.stop_reason === "max_tokens"
                ) {
                  failure = "upstream stopped at max_tokens";
                  break relay;
                }
              } catch {
                /* ignore keep-alive pings and non-JSON lines */
              }
            }
          }
        }
      } catch (err) {
        failure = `upstream read failed: ${(err as Error).message}`;
      } finally {
        if (failure) {
          console.error(`turn SSE relay aborted: ${failure}`);
          reader.cancel().catch(() => {});
          controller.error(new Error(failure));
        } else {
          controller.close();
        }
      }
    },
  });
}

function streamMock(
  intent: "present" | "free",
  resolution: TurnResolution,
  headers: Record<string, string>,
): Response {
  const encoder = new TextEncoder();
  const refused = resolution.attemptedActions
    .map((a) => a.label.toLowerCase())
    .join(", ");
  const text =
    intent === "present"
      ? "The ward is quiet except for a fan turning somewhere down the " +
        "corridor. A nurse waves you over: a mother stands by the stretcher, " +
        "a boy curled on his side under a blanket. (Local mock — add your " +
        "API key to .dev.vars to stream the real world engine.)"
      : resolution.endReason === "referral"
        ? `The transfer is committed; the chain is in motion and there is ` +
          `nothing left to decide — only the long wait for headlights. The ` +
          `night settles at minute ${Math.round(resolution.elapsedMin)}. ` +
          `(Local mock — the real world engine would close this scene.)`
        : resolution.endReason === "clockMax"
          ? `The clock has run out at minute ${Math.round(resolution.elapsedMin)}; ` +
            `the night is over and no further move belongs to the doctor. ` +
            `(Local mock — the real world engine would close this scene.)`
          : refused
            ? `The nurse shakes her head — ${refused}: not here, not tonight. ` +
              `The request costs you phone time; the clock reads minute ` +
              `${Math.round(resolution.elapsedMin)}. (Local mock — the real ` +
              `world engine would narrate this refusal.)`
            : `The night moves on. Your orders are carried out; the clock reads ` +
              `minute ${Math.round(resolution.elapsedMin)} and the child shifts on ` +
              `the stretcher. (Local mock — the real world engine would narrate ` +
              `this turn.)`;
  const words = text.split(" ");
  const stream = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(w + " "));
        await new Promise((r) => setTimeout(r, 45));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers });
}
