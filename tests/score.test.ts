// The deterministic 0–100 debrief engine, tested against the REAL hero case
// (not a fixture): weights and rulings here are the clinically approved ones
// (docs/GUN3-SKOR-ONAY.md), so a drift in either the engine or the case file
// breaks a test. Timing bands derive from the case's own stage table:
// S0@0 · S1@120 · S2@300 · S3@480, referTargetByMin 90, clock ceiling 600.
import { describe, expect, it } from "vitest";
import { appendicitisRural as spec } from "../functions/cases/appendicitis-rural";
import { computeScore } from "../functions/lib/score";

const entry = (id: string, atMin: number) => ({ id, atMin });

function score(
  orderedLog: { id: string; atMin: number }[],
  referralStartedAtMin: number | null,
  elapsedMin = referralStartedAtMin ?? 600,
) {
  return computeScore(spec, { elapsedMin, orderedLog, referralStartedAtMin });
}

const axis = (r: ReturnType<typeof score>, key: string) =>
  r.axes.find((a) => a.key === key)!;

describe("referral timing (60 pts — the hinge of the case)", () => {
  it("grades the DECISION minute (the order-log draw), not the chain activation", () => {
    // Committed at minute 85 on the clock the doctor saw; the phone call
    // completed at 100. Care bundled into the committing turn must not
    // push the grade past the window.
    const r = score([entry("history_exam", 15), entry("start_referral", 85)], 100);
    expect(axis(r, "timing").earned).toBe(60);
    expect(r.signals.referralDecisionMin).toBe(85);
  });

  it("the 90-minute target is inclusive: 90 → 60/60, 91 → late band", () => {
    const at = (min: number) =>
      axis(score([entry("history_exam", 10), entry("start_referral", min)], min + 15), "timing")
        .earned;
    expect(at(90)).toBe(60);
    expect(at(91)).toBe(50); // still stage S0 — top late band
  });

  it("late bands run 50 → 10 by the stage reached when the chain started", () => {
    const late = (min: number) =>
      axis(score([entry("start_referral", min)], min + 15), "timing").earned;
    expect(late(119)).toBe(50); // S0
    expect(late(120)).toBe(37); // S1 boundary is inclusive
    expect(late(300)).toBe(23); // S2 — the false-relief window
    expect(late(480)).toBe(10); // S3 — the night already decided
  });

  it("never referring scores 0/60 and ends the case at the clock ceiling", () => {
    const r = score([entry("history_exam", 15)], null, 600);
    expect(axis(r, "timing").earned).toBe(0);
    expect(r.signals.endReason).toBe("clockMax");
  });

  it("a truncated log falls back to the activation minute — stricter, never kinder", () => {
    const r = score([], 100); // no start_referral entry survived
    expect(r.signals.referralDecisionMin).toBe(100);
    expect(axis(r, "timing").earned).toBe(50); // graded at 100, not 85
  });
});

describe("resource discipline (25 pts) — the blind-commit ruling", () => {
  it("referring with ONLY a refused CT ask is a blind commit: −10", () => {
    // The refused request is logged but was never performed — it can not
    // stand in for a bedside assessment (madde-5, Dr. Şahin).
    const r = score([entry("order_ct", 10), entry("start_referral", 25)], 40);
    const d = axis(r, "discipline");
    expect(d.earned).toBe(15);
    expect(d.lines.join(" ")).toContain("without any bedside assessment");
  });

  it("one exam before committing clears the blind-commit check", () => {
    const r = score([entry("history_exam", 15), entry("start_referral", 30)], 45);
    expect(axis(r, "discipline").earned).toBe(25);
  });

  it("a serial re-exam counts as an assessment too", () => {
    const r = score([entry("reexamine_observe", 20), entry("start_referral", 55)], 70);
    expect(axis(r, "discipline").earned).toBe(25);
  });

  it("asking for the CT once is free; asking again costs 5 per repeat", () => {
    const once = score([entry("history_exam", 10), entry("order_ct", 20), entry("start_referral", 40)], 55);
    expect(axis(once, "discipline").earned).toBe(25);
    const thrice = score(
      [entry("history_exam", 10), entry("order_ct", 20), entry("order_ct", 30), entry("order_ct", 40), entry("start_referral", 60)],
      75,
    );
    expect(axis(thrice, "discipline").earned).toBe(15); // −(3−1)×5
  });

  it("waiting for the morning sonographer is the heaviest penalty: −15", () => {
    const r = score(
      [entry("history_exam", 10), entry("await_morning_us", 30), entry("start_referral", 340)],
      355,
    );
    expect(axis(r, "discipline").earned).toBe(10);
  });

  it("penalties floor at 0 and the arithmetic says so on screen", () => {
    const r = score(
      [entry("await_morning_us", 10), entry("await_morning_us", 320), entry("start_referral", 630)],
      600,
    );
    const d = axis(r, "discipline");
    expect(d.earned).toBe(0);
    expect(d.lines.join(" ")).toContain("floored at 0");
  });
});

describe("differential workup (15 pts) — mimic exclusion with tools on hand", () => {
  it("history+exam 9, urinalysis 3, X-ray 3 — and the points sum to 15", () => {
    const all = score(
      [entry("history_exam", 15), entry("urinalysis", 45), entry("xray_abd", 70), entry("start_referral", 85)],
      100,
    );
    const d = axis(all, "differential");
    expect(d.earned).toBe(15);
    expect(d.max).toBe(15);
  });

  it("credit is per action, once — re-ordering the same test earns nothing", () => {
    const r = score(
      [entry("urinalysis", 20), entry("urinalysis", 60), entry("start_referral", 80)],
      95,
    );
    expect(axis(r, "differential").earned).toBe(3);
    expect(r.signals.differentialMissed.map((m) => m.actionId)).toEqual([
      "history_exam",
      "xray_abd",
    ]);
  });
});

describe("the whole number", () => {
  it("the taught play still reaches 100: full workup inside the 90-minute window", () => {
    const r = score(
      [entry("history_exam", 15), entry("urinalysis", 45), entry("xray_abd", 70), entry("start_referral", 85)],
      100,
    );
    expect(r.score).toBe(100);
  });

  it("axes always sum to the score", () => {
    const r = score(
      [entry("order_ct", 5), entry("order_ct", 15), entry("await_morning_us", 25), entry("start_referral", 330)],
      345,
    );
    expect(r.score).toBe(r.axes.reduce((s, a) => s + a.earned, 0));
  });
});
