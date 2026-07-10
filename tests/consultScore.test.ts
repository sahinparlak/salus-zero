// Code-owned PAS/Alvarado — the deterministic scorer the companion's numbers
// come from. Thresholds trace to appendicitisReference.ts §A/§B [S: H&A40].
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CHIP,
  computeAlvarado,
  computePas,
  renderScoresBlock,
} from "../functions/lib/consultScore";
import type { Intake } from "../functions/lib/consultPrompt";

function intake(over: Partial<Intake> = {}): Intake {
  return {
    name: "Test",
    ageYears: 10,
    sex: "male",
    complaint: "",
    complaintChips: [],
    examFindings: [],
    resources: [],
    transferTimeMin: 240,
    labs: { wbcK: null, neutPct: null, tempC: null },
    clinicianRole: "Doctor / GP",
    clinicianName: "",
    ...over,
  };
}

const FULL = intake({
  complaintChips: [CHIP.migration, CHIP.anorexia, CHIP.nausea, CHIP.fever],
  examFindings: [CHIP.rlqTenderness, CHIP.hopCough, CHIP.rebound],
  labs: { wbcK: 15.2, neutPct: 78, tempC: 38.2 },
});

describe("PAS (reference §A)", () => {
  it("scores the full house 10/10", () => {
    const s = computePas(FULL);
    expect(s.total).toBe(10);
    expect(s.computable).toBe(true);
    expect(s.notGiven).toEqual([]);
  });

  it("scores the red-team CR scenario (no fever chip, temp given later) 10/10", () => {
    const s = computePas(
      intake({
        complaintChips: [CHIP.migration, CHIP.anorexia, CHIP.nausea],
        examFindings: [CHIP.rlqTenderness, CHIP.hopCough, CHIP.percussion],
        labs: { wbcK: 15.2, neutPct: 78, tempC: 38.2 },
      }),
    );
    expect(s.total).toBe(10);
  });

  it("WBC boundary: ≥10,000 is inclusive", () => {
    const at = intake({ labs: { wbcK: 10, neutPct: null, tempC: null } });
    expect(
      computePas(at).components.find((c) => c.label.startsWith("Leukocytosis"))
        ?.met,
    ).toBe(true);
    const below = intake({ labs: { wbcK: 9.9, neutPct: null, tempC: null } });
    expect(
      computePas(below).components.find((c) =>
        c.label.startsWith("Leukocytosis"),
      )?.met,
    ).toBe(false);
  });

  it("ANC boundary: >7,500 strict (9.6k × 78% = 7,488 → unmet; 9.7k × 78% = 7,566 → met)", () => {
    const under = intake({ labs: { wbcK: 9.6, neutPct: 78, tempC: null } });
    const over = intake({ labs: { wbcK: 9.7, neutPct: 78, tempC: null } });
    const anc = (s: ReturnType<typeof computePas>) =>
      s.components.find((c) => c.label.startsWith("Neutrophilia"))?.met;
    expect(anc(computePas(under))).toBe(false);
    expect(anc(computePas(over))).toBe(true);
  });

  it("fever: PAS needs ≥38.0; 37.9 unmet, 38.0 met; chip alone counts", () => {
    const f = (t: number | null, chips: string[] = []) =>
      computePas(
        intake({ complaintChips: chips, labs: { wbcK: null, neutPct: null, tempC: t } }),
      ).components.find((c) => c.label.startsWith("Fever"))!;
    expect(f(37.9).met).toBe(false);
    expect(f(38.0).met).toBe(true);
    expect(f(null, [CHIP.fever]).met).toBe(true);
    expect(f(null).given).toBe(false);
  });

  it("bands: 2→low, 3→equivocal, 7→high", () => {
    expect(computePas(intake({ examFindings: [CHIP.rlqTenderness] })).band).toContain("low");
    expect(
      computePas(
        intake({ complaintChips: [CHIP.nausea], examFindings: [CHIP.rlqTenderness] }),
      ).band,
    ).toContain("equivocal");
    expect(computePas(FULL).band).toContain("high");
  });

  it("empty intake → not computable, no '= N/10' in the line", () => {
    const s = computePas(intake());
    expect(s.computable).toBe(false);
    expect(s.line).toContain("not computable");
    expect(s.line).not.toMatch(/= \d+\/10/);
  });
});

describe("Alvarado (reference §B, Table 40.1)", () => {
  it("scores FULL 10/10 with rebound; 9/10 without", () => {
    expect(computeAlvarado(FULL).total).toBe(10);
    const noRebound = {
      ...FULL,
      examFindings: [CHIP.rlqTenderness, CHIP.hopCough],
    };
    const s = computeAlvarado(noRebound);
    expect(s.total).toBe(9);
    expect(s.notGiven).toContain("Rebound pain");
  });

  it("WBC boundary: >10,000 strict — 10.0 unmet (PAS diverges here by design)", () => {
    const at = intake({ labs: { wbcK: 10, neutPct: null, tempC: null } });
    expect(
      computeAlvarado(at).components.find((c) =>
        c.label.startsWith("Leukocytosis"),
      )?.met,
    ).toBe(false);
    expect(
      computeAlvarado(
        intake({ labs: { wbcK: 10.1, neutPct: null, tempC: null } }),
      ).components.find((c) => c.label.startsWith("Leukocytosis"))?.met,
    ).toBe(true);
  });

  it("fever: >37.3 — 37.4 met on Alvarado while PAS stays unmet", () => {
    const t = intake({ labs: { wbcK: null, neutPct: null, tempC: 37.4 } });
    expect(
      computeAlvarado(t).components.find((c) => c.label.startsWith("Fever"))?.met,
    ).toBe(true);
    expect(
      computePas(t).components.find((c) => c.label.startsWith("Fever"))?.met,
    ).toBe(false);
  });

  it("left shift: neutrophils >75% strict", () => {
    const at = intake({ labs: { wbcK: null, neutPct: 75, tempC: null } });
    const over = intake({ labs: { wbcK: null, neutPct: 75.1, tempC: null } });
    const ls = (s: ReturnType<typeof computeAlvarado>) =>
      s.components.find((c) => c.label.startsWith("Left shift"))?.met;
    expect(ls(computeAlvarado(at))).toBe(false);
    expect(ls(computeAlvarado(over))).toBe(true);
  });
});

describe("score lines & block (format contract + age rail)", () => {
  it("computable lines match the ScoreMeter contract: name + '= N/10' on one line", () => {
    for (const s of [computePas(FULL), computeAlvarado(FULL)]) {
      expect(s.line).toMatch(new RegExp(`^${s.name}: .*= ${s.total}/10`));
      expect(s.line).not.toContain("\n");
    }
  });

  it("renderScoresBlock carries the age caveat only under 4 years", () => {
    expect(renderScoresBlock({ ...FULL, ageYears: 2 })).toContain("AGE CAVEAT");
    expect(renderScoresBlock({ ...FULL, ageYears: 5 })).not.toContain(
      "AGE CAVEAT",
    );
  });
});

describe("chip labels stay in sync with the UI", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const app = readFileSync(join(here, "../src/App.tsx"), "utf8");
  // The scorer reads complaint components from intake.complaintChips and exam
  // components from intake.examFindings — so each label must live in the
  // MATCHING UI array, not merely somewhere in the file. A chip moved between
  // arrays silently un-scores its component; this pins membership.
  const arrayBlock = (name: string) => {
    const m = app.match(new RegExp(`const ${name} = \\[([^\\]]+)\\]`));
    if (!m) throw new Error(`${name} array not found in App.tsx`);
    return m[1];
  };
  const complaintBlock = arrayBlock("COMPLAINT_CHIPS");
  const examBlock = arrayBlock("EXAM_CHIPS");

  it("complaint-scored chips live in COMPLAINT_CHIPS", () => {
    for (const label of [CHIP.migration, CHIP.anorexia, CHIP.nausea, CHIP.fever]) {
      expect(complaintBlock, `complaint chip drifted: "${label}"`).toContain(
        `"${label}"`,
      );
    }
  });

  it("exam-scored chips live in EXAM_CHIPS", () => {
    for (const label of [
      CHIP.rlqTenderness,
      CHIP.hopCough,
      CHIP.percussion,
      CHIP.rebound,
    ]) {
      expect(examBlock, `exam chip drifted: "${label}"`).toContain(`"${label}"`);
    }
  });
});
