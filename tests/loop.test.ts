// The turn resolver's two safety-critical behaviors, against the REAL case:
// the one irreversible action (referral) may never fire from a keyword, and
// the negation NLP may never register an order the player refused to make.
// Time semantics ride along — the clock is the currency of the whole game.
import { describe, expect, it } from "vitest";
import { appendicitisRural as spec } from "../functions/cases/appendicitis-rural";
import {
  matchActionsInText,
  resolveTurn,
  TALK_ONLY_COST_MIN,
  type TurnInput,
} from "../functions/lib/loop";

function turn(over: Partial<TurnInput> = {}) {
  return resolveTurn(spec, {
    elapsedMin: 0,
    clickedActions: [],
    playerInput: undefined,
    orderedLog: [],
    referralStartedAtMin: null,
    ...over,
  });
}

describe("the irreversible referral", () => {
  it("a typed mention only raises pendingReferral — never the chain itself", () => {
    const r = turn({ playerInput: "should I transfer him to the city?" });
    expect(r.pendingReferral).toBe(true);
    expect(r.referralStartedAtMin).toBeNull();
    expect(r.caseOver).toBe(false);
    expect(r.orderedLog).toEqual([]);
  });

  it("a clicked referral commits: chain starts when the call completes, case over", () => {
    const r = turn({ clickedActions: ["start_referral"] });
    expect(r.referralStartedAtMin).toBe(15); // the 15-minute phone call
    expect(r.caseOver).toBe(true);
    expect(r.endReason).toBe("referral");
    expect(r.pendingReferral).toBe(false);
  });

  it("once started, a repeat commit is a no-op, not another phone call", () => {
    const r = turn({
      elapsedMin: 100,
      clickedActions: ["start_referral"],
      referralStartedAtMin: 100,
    });
    expect(r.referralStartedAtMin).toBe(100);
    expect(r.turnActions).toEqual([]);
    expect(r.turnCostMin).toBe(TALK_ONLY_COST_MIN);
  });

  it("mentioning transfer after the chain started raises nothing", () => {
    const r = turn({
      elapsedMin: 120,
      playerInput: "how far is the ambulance? transfer status?",
      referralStartedAtMin: 100,
    });
    expect(r.pendingReferral).toBe(false);
  });
});

describe("negation NLP — refusals must not become orders", () => {
  const ids = (text: string) => matchActionsInText(spec, text);

  it('"don\'t order a CT" registers nothing', () => {
    expect(ids("don't order a CT")).toEqual([]);
  });

  it('"there is no CT here" registers nothing (curly apostrophes too)', () => {
    expect(ids("there is no CT here")).toEqual([]);
    expect(ids("we don’t have a CT")).toEqual([]);
  });

  it('"no ultrasound here, refer now" registers the referral, not the scan', () => {
    expect(ids("no ultrasound here, refer now")).toEqual(["start_referral"]);
  });

  it("punctuation breaks the negation bond: the order after the dash registers", () => {
    expect(ids("no choice — transfer him now")).toEqual(["start_referral"]);
  });

  it("a negation for another verb does not shield the order", () => {
    // "don't DELAY" negates the delay, not the referral that follows it.
    expect(ids("dont delay refer now")).toEqual(["start_referral"]);
  });

  it('"don\'t wait for the morning ultrasound" registers NOTHING (the "morning" gap, fixed)', () => {
    // Before the fix the wait-trap was correctly negated but the bare
    // "ultrasound" keyword still registered a scan request, because the
    // negation refused to flow through "morning".
    expect(ids("don't wait for the morning ultrasound")).toEqual([]);
  });

  it('"wait for the morning ultrasound" is the morning trap, not a scan request', () => {
    // Longer (more specific) keyword wins over the bare "ultrasound".
    expect(ids("wait for the morning ultrasound")).toEqual(["await_morning_us"]);
  });
});

describe("time semantics — every action costs its minutes", () => {
  it("a turn costs the SUM of its actions; refused requests still burn phone time", () => {
    const r = turn({
      playerInput: "order a CT and start IV fluids",
      clickedActions: [],
    });
    // order_ct 15 (refused — ct_abd unavailable) + iv_fluids 15 (performed)
    expect(r.turnCostMin).toBe(30);
    expect(r.attemptedActions.map((a) => a.id)).toEqual(["order_ct"]);
    expect(r.turnActions.map((a) => a.id)).toEqual(["iv_fluids"]);
    // The refusal carries the constraint board's authored reason.
    expect(r.attemptedActions[0].reason).toContain("no scanner here");
  });

  it("a pure talk turn still costs a few minutes", () => {
    const r = turn({ playerInput: "how are you feeling, Emir?" });
    expect(r.turnCostMin).toBe(TALK_ONLY_COST_MIN);
  });

  it("orders are stamped with the DRAW minute, not the end of the turn", () => {
    const r = turn({ elapsedMin: 50, clickedActions: ["cbc"] });
    expect(r.elapsedMin).toBe(90); // 50 + 40 turnaround
    expect(r.orderedLog).toEqual([{ id: "cbc", atMin: 50 }]);
  });

  it("unknown clicked ids are ignored, never executed", () => {
    const r = turn({ clickedActions: ["__proto__", "not_an_action"] });
    expect(r.turnActions).toEqual([]);
    expect(r.turnCostMin).toBe(TALK_ONLY_COST_MIN);
  });
});
