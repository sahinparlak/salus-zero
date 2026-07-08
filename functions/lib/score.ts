// The deterministic half of the debrief. Pure functions, worker-only,
// code-owned — the same discipline as the clock and the vitals: the MODEL
// writes the teaching, the CODE computes the number. A model-chosen score
// would be non-deterministic and indefensible ("why 73?"); this one is
// arithmetic the player can read line by line on screen.
//
// The three axes are the only ones the project grades — deliberately the
// indefensibly-correct ones (ROADMAP §3.7). All weights are a DRAFT pending
// Dr. Şahin's sign-off (docs/GUN3-SKOR-ONAY.md):
//
//   1. Referral timing        60 pts  (the hinge of the whole case)
//   2. Resource discipline    25 pts  (first ask free; repeats/waiting cost)
//   3. Differential workup    15 pts  (mimic exclusion with tools on hand)
//
// Contested clinical judgment (antibiotic choice, fluid strategy, analgesia
// timing) is NEVER scored — it belongs to the debrief text, not the number.

import type { CaseSpec, Stage } from "./caseSpec";
import type { EndReason, OrderedEntry } from "./loop";
import { maxClockOf, stageOf } from "./stage";

export interface ScoreAxis {
  key: "timing" | "discipline" | "differential";
  label: string;
  earned: number;
  max: number;
  // Human-readable arithmetic, one line per component — rendered in the
  // reveal UI and handed to the debrief model as ground truth about the
  // score (so its prose never contradicts the number).
  lines: string[];
}

// Everything the debrief prompt needs to talk about the night factually.
export interface ScoreSignals {
  endReason: Exclude<EndReason, null>;
  finalElapsedMin: number;
  // When the DECISION was made (the clock the doctor saw when committing) —
  // this is what timing grades. The chain ACTIVATES at referralStartedAtMin
  // (decision + the phone call); the ambulance ETA counts from there.
  referralDecisionMin: number | null;
  referralStartedAtMin: number | null;
  referTargetByMin: number;
  stageIdAtReferral: string | null;
  finalStageId: string;
  // Stages the night actually passed through, in order — the physiology the
  // player lived, with the authored PAS trajectory for the debrief.
  stagesReached: { id: string; atMin: number; pas: number | null }[];
  // Forbidden-resource asks, grouped per resource id.
  forbiddenAsks: { resource: string; count: number; firstAtMin: number }[];
  // Wait-trap actions taken (the heaviest resource error).
  waitsTaken: { actionId: string; label: string; atMin: number }[];
  differentialDone: { actionId: string; label: string; atMin: number }[];
  differentialMissed: { actionId: string; label: string }[];
}

export interface ScoreResult {
  score: number; // 0-100
  axes: ScoreAxis[];
  signals: ScoreSignals;
  // The full order log with human labels, for the debrief prompt — the model
  // must talk about "Order CBC at minute 20", not internal action ids.
  orderedLogLabeled: { label: string; atMin: number }[];
}

export interface ScoreInput {
  elapsedMin: number;
  orderedLog: OrderedEntry[];
  referralStartedAtMin: number | null;
}

const TIMING_MAX = 60;
const DISCIPLINE_MAX = 25;
const REPEAT_ASK_PENALTY = 5;
const WAIT_PENALTY = 15;
// A late referral still beats no referral: bands run 50 → 10 by the stage
// the patient had reached when the chain finally started, derived from the
// case's own stage table so the engine stays domain-agnostic.
const LATE_BAND_HIGH = 50;
const LATE_BAND_LOW = 10;

function sortedStages(spec: CaseSpec): Stage[] {
  return [...spec.stages].sort(
    (a, b) => a.triggerAtAccumulatedDelayMin - b.triggerAtAccumulatedDelayMin,
  );
}

// Timing grades the DECISION, not the phone call: the scored minute is the
// clock the doctor saw when committing (the referral's orderedLog draw-minute,
// which loop.ts stamps at turn start). Grading the chain-activation minute
// instead would hide a ~15-minute-earlier effective deadline behind the
// visible clock and dock points for care bundled into the committing turn —
// starting antibiotics on the way out the door is exactly what the case
// teaches. Falls back to the activation minute if the log entry is missing
// (truncated/forged log): worst case the score is slightly stricter, never
// more generous.
function referralDecisionMin(spec: CaseSpec, input: ScoreInput): number | null {
  if (input.referralStartedAtMin === null) return null;
  const referralActionId = spec.actionCatalog.find(
    (a) => a.requiresResource === "referral",
  )?.id;
  const entry = referralActionId
    ? input.orderedLog.find((e) => e.id === referralActionId)
    : undefined;
  return entry ? entry.atMin : input.referralStartedAtMin;
}

function timingAxis(spec: CaseSpec, decisionMin: number | null): ScoreAxis {
  const target = spec.scoringSignals.referTargetByMin;
  if (decisionMin === null) {
    return {
      key: "timing",
      label: "Referral timing",
      earned: 0,
      max: TIMING_MAX,
      lines: [
        `The referral chain was never started — the case ended at the clock ceiling (minute ${maxClockOf(spec)}). 0/${TIMING_MAX}.`,
      ],
    };
  }
  const t = Math.round(decisionMin);
  if (decisionMin <= target) {
    return {
      key: "timing",
      label: "Referral timing",
      earned: TIMING_MAX,
      max: TIMING_MAX,
      lines: [
        `Referral committed at minute ${t} — within the ${target}-minute window. ${TIMING_MAX}/${TIMING_MAX}.`,
      ],
    };
  }
  const stages = sortedStages(spec);
  const stageAtDecision = stageOf(spec, decisionMin);
  const idx = stages.findIndex((s) => s.id === stageAtDecision.id);
  const span = Math.max(stages.length - 1, 1);
  const earned = Math.round(
    LATE_BAND_HIGH - (idx * (LATE_BAND_HIGH - LATE_BAND_LOW)) / span,
  );
  return {
    key: "timing",
    label: "Referral timing",
    earned,
    max: TIMING_MAX,
    lines: [
      `Referral committed at minute ${t} — past the ${target}-minute window, with the patient already in stage ${stageAtDecision.id}. ${earned}/${TIMING_MAX}.`,
    ],
  };
}

function disciplineAxis(spec: CaseSpec, orderedLog: OrderedEntry[]): ScoreAxis {
  const catalog = new Map(spec.actionCatalog.map((a) => [a.id, a]));
  const forbidden = new Set(spec.scoringSignals.forbiddenResources);
  const waits = new Set(spec.scoringSignals.waitActions);
  const lines: string[] = [];
  let penalty = 0;

  // Asks grouped per RESOURCE (order_ct twice = one repeat of ct_abd).
  const asks = new Map<string, number>();
  for (const entry of orderedLog) {
    const res = catalog.get(entry.id)?.requiresResource;
    if (res && forbidden.has(res)) asks.set(res, (asks.get(res) ?? 0) + 1);
  }
  for (const [resource, count] of asks) {
    const label =
      spec.constraintBoard.find((c) => c.key === resource)?.label ?? resource;
    if (count === 1) {
      lines.push(`${label} requested once — asking costs only phone time. No penalty.`);
    } else {
      const p = (count - 1) * REPEAT_ASK_PENALTY;
      penalty += p;
      lines.push(
        `${label} requested ${count}× — the answer was never going to change. −${p}.`,
      );
    }
  }

  const waitEntries = orderedLog.filter((e) => waits.has(e.id));
  for (const entry of waitEntries) {
    penalty += WAIT_PENALTY;
    const label = catalog.get(entry.id)?.label ?? entry.id;
    lines.push(
      `"${label}" at minute ${Math.round(entry.atMin)} — waiting for absent imaging is the one unaffordable purchase. −${WAIT_PENALTY}.`,
    );
  }

  const earned = Math.max(DISCIPLINE_MAX - penalty, 0);
  if (lines.length === 0) {
    lines.push(
      `No time spent chasing resources this hospital does not have. ${DISCIPLINE_MAX}/${DISCIPLINE_MAX}.`,
    );
  } else if (penalty > DISCIPLINE_MAX) {
    // Without this line the listed penalties would sum past the axis and the
    // on-screen arithmetic wouldn't add up.
    lines.push(
      `Penalties total −${penalty}, more than this axis holds — floored at 0/${DISCIPLINE_MAX}.`,
    );
  } else {
    lines.push(`Resource discipline: ${earned}/${DISCIPLINE_MAX}.`);
  }
  return {
    key: "discipline",
    label: "Resource discipline",
    earned,
    max: DISCIPLINE_MAX,
    lines,
  };
}

function differentialAxis(
  spec: CaseSpec,
  orderedLog: OrderedEntry[],
): ScoreAxis {
  const catalog = new Map(spec.actionCatalog.map((a) => [a.id, a]));
  const unavailable = new Set(spec.resourceProfile.unavailable);
  // A refused request must never earn workup credit — irrelevant for this
  // case (all differential actions are available) but the engine is generic.
  const performable = (id: string) => {
    const res = catalog.get(id)?.requiresResource;
    return !res || !unavailable.has(res);
  };
  const ordered = new Set(orderedLog.map((e) => e.id).filter(performable));
  const lines: string[] = [];
  let earned = 0;
  let max = 0;
  for (const d of spec.scoringSignals.differentialActions) {
    max += d.points;
    if (ordered.has(d.actionId)) {
      earned += d.points;
      lines.push(`✓ ${d.label}. +${d.points}.`);
    } else {
      lines.push(`✗ Not done: ${d.label}. 0/${d.points}.`);
    }
  }
  if (lines.length === 0) lines.push("This case defines no differential credit.");
  return {
    key: "differential",
    label: "Differential workup",
    earned,
    max,
    lines,
  };
}

export function computeScore(spec: CaseSpec, input: ScoreInput): ScoreResult {
  const catalog = new Map(spec.actionCatalog.map((a) => [a.id, a]));
  const forbidden = new Set(spec.scoringSignals.forbiddenResources);
  const waits = new Set(spec.scoringSignals.waitActions);
  const decisionMin = referralDecisionMin(spec, input);

  const axes = [
    timingAxis(spec, decisionMin),
    disciplineAxis(spec, input.orderedLog),
    differentialAxis(spec, input.orderedLog),
  ];
  const score = axes.reduce((sum, a) => sum + a.earned, 0);

  const stages = sortedStages(spec);
  const stagesReached = stages
    .filter((s) => input.elapsedMin >= s.triggerAtAccumulatedDelayMin)
    .map((s) => ({
      id: s.id,
      atMin: s.triggerAtAccumulatedDelayMin,
      pas: s.pas,
    }));

  const forbiddenAsks = new Map<string, { count: number; firstAtMin: number }>();
  for (const entry of input.orderedLog) {
    const res = catalog.get(entry.id)?.requiresResource;
    if (!res || !forbidden.has(res)) continue;
    const prev = forbiddenAsks.get(res);
    if (prev) prev.count += 1;
    else forbiddenAsks.set(res, { count: 1, firstAtMin: entry.atMin });
  }

  const differentialDoneAt = new Map<string, number>();
  for (const entry of input.orderedLog) {
    if (!differentialDoneAt.has(entry.id))
      differentialDoneAt.set(entry.id, entry.atMin);
  }

  const signals: ScoreSignals = {
    endReason: input.referralStartedAtMin !== null ? "referral" : "clockMax",
    finalElapsedMin: input.elapsedMin,
    referralDecisionMin: decisionMin,
    referralStartedAtMin: input.referralStartedAtMin,
    referTargetByMin: spec.scoringSignals.referTargetByMin,
    stageIdAtReferral: decisionMin !== null ? stageOf(spec, decisionMin).id : null,
    finalStageId: stageOf(spec, input.elapsedMin).id,
    stagesReached,
    forbiddenAsks: [...forbiddenAsks.entries()].map(([resource, v]) => ({
      resource,
      count: v.count,
      firstAtMin: v.firstAtMin,
    })),
    waitsTaken: input.orderedLog
      .filter((e) => waits.has(e.id))
      .map((e) => ({
        actionId: e.id,
        label: catalog.get(e.id)?.label ?? e.id,
        atMin: e.atMin,
      })),
    differentialDone: spec.scoringSignals.differentialActions
      .filter((d) => differentialDoneAt.has(d.actionId))
      .map((d) => ({
        actionId: d.actionId,
        label: d.label,
        atMin: differentialDoneAt.get(d.actionId)!,
      })),
    differentialMissed: spec.scoringSignals.differentialActions
      .filter((d) => !differentialDoneAt.has(d.actionId))
      .map((d) => ({ actionId: d.actionId, label: d.label })),
  };

  return {
    score,
    axes,
    signals,
    orderedLogLabeled: input.orderedLog.map((e) => ({
      label: catalog.get(e.id)?.label ?? e.id,
      atMin: e.atMin,
    })),
  };
}
