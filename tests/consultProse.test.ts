// The consult format contract parser — the client-side half of "code owns
// every number": these pin the score-line scanning (both orders, shared
// lines, restatements, out-of-range rejection) and the /g regex statefulness
// that a first-match scan or a stale lastIndex would silently corrupt.
import { describe, expect, it } from "vitest";
import { parseConsultProse, scoresInText } from "../src/consult/consultProse";

const flatScores = (text: string) =>
  parseConsultProse(text).flatMap((s) => s.scores);

describe("parseConsultProse — score lines", () => {
  it("reads a name-first score line", () => {
    expect(flatScores("PAS = 8/10 today")).toEqual([
      { name: "PAS", value: 8 },
    ]);
  });

  it("reads a total-first score line (= 8/10 PAS)", () => {
    expect(flatScores("scored = 8/10 on PAS tonight")).toEqual([
      { name: "PAS", value: 8 },
    ]);
  });

  it("feeds BOTH meters when two scores share one line", () => {
    expect(flatScores("PAS 8/10, Alvarado 7/10")).toEqual([
      { name: "PAS", value: 8 },
      { name: "Alvarado", value: 7 },
    ]);
  });

  it("last statement of a score wins, WITHOUT reordering the meters", () => {
    const text = "PAS = 6/10\nAlvarado = 4/10\nwith labs, PAS = 7/10";
    // In-place update: PAS stays first — a restated score must not swap
    // meter rows mid-stream (row order drives the animation stagger).
    expect(flatScores(text)).toEqual([
      { name: "PAS", value: 7 },
      { name: "Alvarado", value: 4 },
    ]);
  });

  it("rejects totals over 10", () => {
    expect(flatScores("PAS = 18/10")).toEqual([]);
  });

  it("is stateless across calls (shared /g regex lastIndex is reset)", () => {
    // Two identical scans must return identical results — a stale lastIndex
    // on the module-level /g regex would drop matches on the second call.
    const line = "PAS 8/10 and Alvarado 7/10";
    expect(flatScores(line)).toEqual(flatScores(line));
  });
});

describe("parseConsultProse — structure", () => {
  it("splits move lines into numbered sections with titles", () => {
    const secs = parseConsultProse(
      "(i) Reading you back: a child.\n(iv) Red flags: none yet.",
    );
    expect(secs.map((s) => s.num)).toEqual(["i", "iv"]);
    expect(secs[0].title).toBe("Reading you back");
    expect(secs[0].blocks[0]).toEqual({ kind: "para", text: "a child." });
  });

  it("classifies bullets and numbered steps", () => {
    const [sec] = parseConsultProse("- a bullet\n2. a step");
    expect(sec.blocks).toEqual([
      { kind: "bullet", text: "a bullet" },
      { kind: "step", n: 2, text: "a step" },
    ]);
  });
});

describe("scoresInText", () => {
  it("flattens the last stated total per score across sections", () => {
    const text =
      "(ii) Supports: PAS = 8/10\n(vi) Referral: with labs PAS = 10/10 and Alvarado = 9/10";
    expect(scoresInText(text)).toEqual({ PAS: 10, Alvarado: 9 });
  });

  it("returns an empty record for scoreless prose", () => {
    expect(scoresInText("no numbers here")).toEqual({});
  });
});
