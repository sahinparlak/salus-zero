// The turn resolver: the game-mechanical half of the physics. Pure functions,
// worker-only, code-owned — the clock advance, the order log, the referral
// state and the end-of-case flags are all computed here. The model narrates
// the world; it never decides what time it is.
//
// Time semantics (the thesis of the game): every action costs its
// baseTimeCostMinutes, a turn costs the SUM of its actions, and a turn with
// no recognized action still costs a few minutes of talk. Ordering a test
// means living through its turnaround — every test is time the ambulance is
// NOT on the road.

import { z } from "zod";
import type { CaseSpec } from "./caseSpec";
import { clampClock, maxClockOf } from "./stage";

// A completed order: the action id and the sim-minute its outcome existed.
// Lab strings are snapshotted at atMin, so a result never silently "updates"
// to a later stage's values — re-ordering is the only way to get serial labs.
export const OrderedEntrySchema = z.object({
  id: z.string(),
  atMin: z.number().finite(),
});
export type OrderedEntry = z.infer<typeof OrderedEntrySchema>;

export type EndReason = "referral" | "clockMax" | null;

export interface TurnResolution {
  // Actions recognized this turn (clicked + matched in free text), deduped.
  turnActions: { id: string; label: string; costMin: number }[];
  // Requests whose resource this hospital does not have: they cost the phone
  // time and are logged (the debrief counts them), but nothing is performed —
  // the world refuses them in-world. Kept separate so the model is never told
  // an impossible thing "was performed". `reason` is the constraint board's
  // authored detail — piped into the turn message so the world refuses with
  // the board's facts instead of improvising its own ("scanner has been
  // down" vs the board's "no scanner here").
  attemptedActions: { id: string; label: string; costMin: number; reason: string }[];
  turnCostMin: number;
  elapsedMin: number;
  orderedLog: OrderedEntry[];
  referralStartedAtMin: number | null;
  // Free text mentioned the referral: the one irreversible action is never
  // executed from a keyword match — the UI must ask for an explicit commit.
  pendingReferral: boolean;
  caseOver: boolean;
  endReason: EndReason;
}

// A pure conversation/exam-by-words turn still burns a little time.
export const TALK_ONLY_COST_MIN = 5;

// "there is no CT here", "don't order a CT" must not register the action —
// but the negation only binds to the keyword through small CONNECTOR words
// ("don't ORDER A ct"). Any other word in between ("dont DELAY refer now")
// means the negation belonged to a different verb, so the action still
// registers. Punctuation and dashes always break the bond ("no choice —
// transfer him now" registers). Curly apostrophes are normalized upstream.
const NEGATION_WORD =
  /\b(no|not|don'?t|do not|can'?t|cannot|won'?t|without|isn'?t|never|unavailable)\b/gi;

const NEGATION_CONNECTORS = new Set([
  // verbs of ordering/doing that a negation naturally flows through
  "order", "get", "request", "send", "do", "run", "check", "wait", "give",
  "start", "hold", "off", "use", "take", "perform", "need", "want", "ask",
  "call", "go", "going", "mind",
  // articles, pronouns, fillers
  "for", "the", "a", "an", "any", "another", "more", "to", "of", "him",
  "her", "it", "that", "this", "some", "be", "able", "even", "yet",
  "again", "just", "please", "really",
]);

function isNegated(prefix: string): boolean {
  // A negation never crosses punctuation — only the last clause matters.
  const clause = prefix.split(/[.,;!?—–-]/).pop() ?? "";
  NEGATION_WORD.lastIndex = 0;
  let last: RegExpExecArray | null = null;
  for (let m; (m = NEGATION_WORD.exec(clause)); ) last = m;
  if (!last) return false;
  const between = clause.slice(last.index + last[0].length);
  const words = between.match(/[\p{L}']+/gu) ?? [];
  return words.every((w) => NEGATION_CONNECTORS.has(w.toLowerCase()));
}

function keywordRegex(keyword: string): RegExp {
  const escaped = keyword
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  // Prefix match on a word boundary: "refer" also hits "referral".
  return new RegExp(`\\b${escaped}`, "i");
}

// Free text -> action ids. Deliberately dumb and visible: the UI echoes every
// registered action back to the player, so a mis-parse is seen, not hidden.
// When two actions' keywords overlap, the longer (more specific) keyword
// wins: "wait for the morning ultrasound" is the morning trap, not a
// request for tonight's scan.
export function matchActionsInText(spec: CaseSpec, text: string): string[] {
  const normalized = text.replace(/[’‘]/g, "'");
  const matches: { id: string; keyword: string }[] = [];
  for (const action of spec.actionCatalog) {
    for (const keyword of action.keywords) {
      const match = keywordRegex(keyword).exec(normalized);
      if (!match) continue;
      if (isNegated(normalized.slice(0, match.index))) continue;
      matches.push({ id: action.id, keyword: keyword.toLowerCase() });
      break;
    }
  }
  return matches
    .filter(
      (m) =>
        !matches.some(
          (other) =>
            other.id !== m.id &&
            other.keyword !== m.keyword &&
            other.keyword.includes(m.keyword),
        ),
    )
    .map((m) => m.id);
}

export interface TurnInput {
  elapsedMin: number;
  clickedActions: string[];
  playerInput?: string;
  orderedLog: OrderedEntry[];
  referralStartedAtMin: number | null;
}

export function resolveTurn(spec: CaseSpec, input: TurnInput): TurnResolution {
  const maxClock = maxClockOf(spec);
  const catalog = new Map(spec.actionCatalog.map((a) => [a.id, a]));
  // The action that starts the transfer chain is identified by its resource,
  // not a hardcoded id — the engine stays domain-agnostic.
  const referralActionId = spec.actionCatalog.find(
    (a) => a.requiresResource === "referral",
  )?.id;

  const clicked = new Set<string>();
  for (const id of input.clickedActions) if (catalog.has(id)) clicked.add(id);
  const ids = new Set<string>(clicked);
  if (input.playerInput) {
    for (const id of matchActionsInText(spec, input.playerInput)) {
      if (catalog.has(id)) ids.add(id);
    }
  }
  // The referral is the ONE irreversible, case-ending action, so a keyword
  // match may never execute it ("should I transfer him?" must not end the
  // case). A free-text mention only raises pendingReferral — the UI turns
  // that into an explicit confirm button, which comes back as a click.
  let pendingReferral = false;
  if (
    referralActionId &&
    ids.has(referralActionId) &&
    !clicked.has(referralActionId)
  ) {
    ids.delete(referralActionId);
    pendingReferral = input.referralStartedAtMin === null;
  }
  // Starting the referral chain is idempotent: once started, a repeat is a
  // no-op, not another 15-minute phone call.
  if (input.referralStartedAtMin !== null && referralActionId) {
    ids.delete(referralActionId);
  }

  // Partition: performed (resource on hand or none needed) vs attempted
  // (resource this hospital lacks). Attempted requests still burn the phone
  // minutes — that friction is the design — but are never "performed".
  const unavailable = new Set(spec.resourceProfile.unavailable);
  const turnActions: TurnResolution["turnActions"] = [];
  const attemptedActions: TurnResolution["attemptedActions"] = [];
  for (const id of ids) {
    const a = catalog.get(id)!;
    const entry = { id: a.id, label: a.label, costMin: a.baseTimeCostMinutes };
    if (a.requiresResource && unavailable.has(a.requiresResource)) {
      const reason =
        spec.constraintBoard.find((c) => c.key === a.requiresResource)
          ?.detail ?? "not available here tonight";
      attemptedActions.push({ ...entry, reason });
    } else {
      turnActions.push(entry);
    }
  }
  const allActions = [...turnActions, ...attemptedActions];
  const turnCostMin = allActions.length
    ? allActions.reduce((sum, a) => sum + a.costMin, 0)
    : TALK_ONLY_COST_MIN;

  const elapsedMin = clampClock(input.elapsedMin + turnCostMin, maxClock);
  // Orders are stamped with the DRAW minute (the clock when the turn began):
  // a sample reflects the patient it was taken from, even if the turnaround
  // crosses a stage boundary. Results become visible at end of turn either
  // way (the log is only appended once the turn resolves). Attempted
  // (refused) requests are logged too — they yield no lab string, but the
  // debrief's forbidden-resource counter reads them from this log.
  const drawnAtMin = clampClock(input.elapsedMin, maxClock);
  const orderedLog = [
    ...input.orderedLog,
    ...allActions.map((a) => ({ id: a.id, atMin: drawnAtMin })),
  ];

  let referralStartedAtMin = input.referralStartedAtMin;
  if (
    referralStartedAtMin === null &&
    referralActionId &&
    ids.has(referralActionId)
  ) {
    // The chain activates when the phone call COMPLETES — the ambulance
    // departs the city at this minute (referral ETA counts from here).
    referralStartedAtMin = elapsedMin;
  }

  const endReason: EndReason =
    referralStartedAtMin !== null
      ? "referral"
      : elapsedMin >= maxClock
        ? "clockMax"
        : null;

  return {
    turnActions,
    attemptedActions,
    turnCostMin,
    elapsedMin,
    orderedLog,
    referralStartedAtMin,
    pendingReferral,
    caseOver: endReason !== null,
    endReason,
  };
}
