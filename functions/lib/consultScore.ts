// ════════════════════════════════════════════════════════════════════════════
// CODE-OWNED PAS / ALVARADO — the companion's score arithmetic, moved out of
// the model. Same doctrine as the hero's score.ts: the number the clinician
// acts on must come from deterministic code; the model is the language skin
// that explains it. Thresholds and weights trace to the surgeon-validated
// reference (appendicitisReference.ts §A and §B, [S: H&A40]) — change them
// THERE first, then here, never here alone.
//
// Semantics: an unticked chip means "not confirmed", not "absent" (the intake
// is confirm-not-compose), so unmet chip components score 0 and are reported
// in notGiven — mirroring the reference's "only score the components the
// clinician actually gave". Labs are null until entered in the labs strip.
// ════════════════════════════════════════════════════════════════════════════
import type { Intake } from "./consultPrompt";

// Chip labels — MUST match src/App.tsx COMPLAINT_CHIPS / EXAM_CHIPS verbatim.
// A renamed chip silently un-scores its component; the unit test pins these.
export const CHIP = {
  migration: "Pain migrated to RLQ",
  anorexia: "Anorexia / won't eat",
  nausea: "Nausea / vomiting",
  fever: "Fever ≥ 38 °C",
  rlqTenderness: "RLQ tenderness",
  hopCough: "Pain on hopping / cough",
  percussion: "Percussion tenderness",
  rebound: "Rebound tenderness",
} as const;

export interface ScoreComponent {
  label: string; // as shown to the model/clinician
  points: number; // weight when met
  met: boolean;
  given: boolean; // false → no structured signal either way (not ticked / no lab)
}

export interface ComputedScore {
  name: "PAS" | "Alvarado";
  components: ScoreComponent[];
  total: number;
  max: 10;
  computable: boolean; // at least one component given
  band: string;
  line: string; // ready-made, format-contract-compatible ("… = N/10 …")
  notGiven: string[];
}

const has = (arr: string[], label: string) => arr.includes(label);

export function computePas(intake: Intake): ComputedScore {
  const chips = intake.complaintChips;
  const exam = intake.examFindings;
  const { wbcK, neutPct, tempC } = intake.labs;
  const anc = wbcK !== null && neutPct !== null ? wbcK * 1000 * (neutPct / 100) : null;

  const components: ScoreComponent[] = [
    c("Migration of pain", 1, has(chips, CHIP.migration), has(chips, CHIP.migration)),
    c("Anorexia", 1, has(chips, CHIP.anorexia), has(chips, CHIP.anorexia)),
    c("Nausea/vomiting", 1, has(chips, CHIP.nausea), has(chips, CHIP.nausea)),
    c(
      "Fever ≥38.0 °C",
      1,
      has(chips, CHIP.fever) || (tempC !== null && tempC >= 38.0),
      has(chips, CHIP.fever) || tempC !== null,
    ),
    c("RLQ tenderness", 2, has(exam, CHIP.rlqTenderness), has(exam, CHIP.rlqTenderness)),
    c(
      "Cough/percussion/hop tenderness",
      2,
      has(exam, CHIP.hopCough) || has(exam, CHIP.percussion),
      has(exam, CHIP.hopCough) || has(exam, CHIP.percussion),
    ),
    c("Leukocytosis (WBC ≥10,000/µL)", 1, wbcK !== null && wbcK >= 10, wbcK !== null),
    c("Neutrophilia (ANC >7,500/µL)", 1, anc !== null && anc > 7500, anc !== null),
  ];
  return finish("PAS", components, pasBand);
}

export function computeAlvarado(intake: Intake): ComputedScore {
  const chips = intake.complaintChips;
  const exam = intake.examFindings;
  const { wbcK, neutPct, tempC } = intake.labs;

  const components: ScoreComponent[] = [
    c("Migration of pain", 1, has(chips, CHIP.migration), has(chips, CHIP.migration)),
    c("Anorexia", 1, has(chips, CHIP.anorexia), has(chips, CHIP.anorexia)),
    c("Nausea/emesis", 1, has(chips, CHIP.nausea), has(chips, CHIP.nausea)),
    c("RLQ tenderness", 2, has(exam, CHIP.rlqTenderness), has(exam, CHIP.rlqTenderness)),
    c("Rebound pain", 1, has(exam, CHIP.rebound), has(exam, CHIP.rebound)),
    c(
      "Fever >37.3 °C",
      1,
      has(chips, CHIP.fever) || (tempC !== null && tempC > 37.3),
      has(chips, CHIP.fever) || tempC !== null,
    ),
    c("Leukocytosis (WBC >10,000)", 2, wbcK !== null && wbcK > 10, wbcK !== null),
    c("Left shift (neutrophils >75%)", 1, neutPct !== null && neutPct > 75, neutPct !== null),
  ];
  return finish("Alvarado", components, alvaradoBand);
}

function c(label: string, points: number, met: boolean, given: boolean): ScoreComponent {
  return { label, points, met, given };
}

function pasBand(total: number): string {
  if (total <= 2) return "low band 0–2: unlikely — look elsewhere, don't close the book";
  if (total <= 6) return "equivocal band 3–6: observe with serial examination";
  return "high band 7–10: appendicitis likely — act on it";
}

function alvaradoBand(total: number): string {
  if (total < 4) return "<4: appendicitis highly unlikely";
  if (total < 7) return "4–6: indeterminate — strong for ruling out below 5 only";
  return "≥7: suggests appendicitis";
}

function finish(
  name: "PAS" | "Alvarado",
  components: ScoreComponent[],
  band: (t: number) => string,
): ComputedScore {
  const total = components.reduce((s, x) => s + (x.met ? x.points : 0), 0);
  const computable = components.some((x) => x.given);
  const notGiven = components.filter((x) => !x.given).map((x) => x.label);
  const scored = components.filter((x) => x.met);
  const line = computable
    ? `${name}: ${
        scored.length
          ? scored.map((x) => `${x.label} +${x.points}`).join(", ")
          : "no positive components"
      } = ${total}/10 (${band(total)}).${
        notGiven.length
          ? ` Not scored — not ticked/entered: ${notGiven.join(", ")}.`
          : ""
      }`
    : `${name}: not computable — no scoreable components entered yet.`;
  return { name, components, total, max: 10, computable, band: band(total), line, notGiven };
}

// The per-turn data block appended to the intake summary. Numbers only — the
// standing rule that the model must present these verbatim and never recompute
// lives in the SYSTEM prompt (static), keeping this block pure data.
export function renderScoresBlock(intake: Intake): string {
  const pas = computePas(intake);
  const alv = computeAlvarado(intake);
  const lines = [
    "CODE-COMPUTED SCORES (CURRENT — recomputed THIS TURN from the structured intake; supersedes any score mentioned anywhere earlier in the conversation):",
    `- ${pas.line}`,
    `- ${alv.line}`,
  ];
  if (intake.ageYears < 4) {
    lines.push(
      "- AGE CAVEAT: PAS is not validated under ~4 years — treat any score as a weak hint only.",
    );
  }
  return lines.join("\n");
}
