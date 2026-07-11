// The decode-artifact gate in front of the money shot. The three garbled
// signatures below are the LIVE ones (observed 2026-07-09/10, both times in
// the final schema field); the clean texts are the abbreviation shapes that
// must never trip a retry. The gate only ever buys one retry — it must be
// loud on real artifacts and silent on clinical prose.
import { describe, expect, it } from "vitest";
import { looksGarbled } from "../functions/api/debrief";

// The gate reads every text field the same way; riding one field is enough.
function out(text: string) {
  return {
    groundTruthReveal: text,
    strengths: [],
    misses: [],
    resourceLesson: "The clock set the tempo of the night.",
  };
}

describe("looksGarbled — the three live artifact signatures", () => {
  it("stuttered word: '…cost.on on on the pathway…'", () => {
    expect(
      looksGarbled(out("Every delay compounded the cost.on on on the pathway to the city.")),
    ).toBe(true);
  });

  it("period-glued fragment: 'suspicion.this is…'", () => {
    expect(
      looksGarbled(out("The exam raised suspicion.this is where the night turned.")),
    ).toBe(true);
  });

  it("truncated trailing token: '…not after it.eq'", () => {
    expect(looksGarbled(out("The chain had to start before the window, not after it.eq"))).toBe(
      true,
    );
  });
});

describe("looksGarbled — clean clinical prose must pass", () => {
  it("'a.m.' with its final period", () => {
    expect(looksGarbled(out("You committed the transfer at 3 a.m. and the night held."))).toBe(
      false,
    );
  });

  it("'a.m' as the very last token (the old dotted set flagged this)", () => {
    expect(looksGarbled(out("The decision came before 3 a.m"))).toBe(false);
  });

  it("'e.g.' mid-sentence", () => {
    expect(
      looksGarbled(out("Supportive care, e.g. fluids and antibiotics, buys transfer time.")),
    ).toBe(false);
  });

  it("'Dr. Parlak' — a name after an honorific", () => {
    expect(looksGarbled(out("Dr. Parlak would call this the reassuring trap."))).toBe(false);
  });

  it("a doubled word is emphasis, not an artifact — three is the signature", () => {
    expect(looksGarbled(out("It was very very late by then."))).toBe(false);
  });
});
