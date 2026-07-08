// The heart of the engine: a case is a DATA FILE, not hardcoded logic.
// This module lives under functions/ and is therefore worker-only — Vite never
// bundles it, so groundTruth/stages/scoring can never leak into the browser.
// The browser only ever sees the projection returned by toPublicCase().

import { z } from "zod";

// One fixed vital set per stage. Keys are stable so the client vital panel and
// the prompt formatter can render them without guessing.
export const VitalsSchema = z.object({
  HR: z.number(),
  RR: z.number(),
  TempC: z.number(),
  SBP: z.number(),
  SpO2: z.number(),
  pain: z.number(),
});

export const StageSchema = z.object({
  id: z.string(), // "S0", "S1", ...
  // Deterministic trigger: total accumulated sim-minutes without definitive
  // action. stageOf() picks the last stage whose trigger has been reached.
  triggerAtAccumulatedDelayMin: z.number(),
  vitals: VitalsSchema,
  examFindings: z.string(), // handed to the model as ground reality
  // Fixed lab/imaging result strings keyed by action id. The model may only
  // narrate these verbatim, and only for tests the player actually ordered —
  // the anti-hallucination fence for every number on screen.
  labs: z.record(z.string()),
  pas: z.number().nullable(),
  pasBreakdown: z.string(), // component-by-component arithmetic, for the debrief
  narrativeCue: z.string(), // what the world should convey (incl. false relief)
});

export const CaseSpecSchema = z.object({
  id: z.string(),
  version: z.string(),
  domain: z.string(), // "pediatric_surgery" | "endocrine_emergency" | ...
  axis: z.enum(["diagnosis", "management"]),
  title: z.string(), // player-visible — must never hint at the diagnosis
  vignette: z.string(), // player-visible opening, in the mother's voice
  patient: z.object({
    name: z.string(),
    ageYears: z.number(),
    sex: z.enum(["male", "female"]),
    weightKg: z.number(),
  }),
  vitalsCatalog: z.array(
    z.object({
      key: VitalsSchema.keyof(),
      label: z.string(),
      unit: z.string(),
      normalLow: z.number(),
      normalHigh: z.number(),
      criticalLow: z.number().nullable(),
      criticalHigh: z.number().nullable(),
      // How the value moves BETWEEN stage anchors (vitalsAt in stage.ts):
      // "linear" glides toward the next stage's anchor so the monitor is
      // alive within a stage; "step" holds the anchor until the next stage
      // triggers — for signs whose change IS a discrete event (e.g. the
      // false-relief pain drop at perforation must land as a cliff, not a
      // three-hour easing).
      drift: z.enum(["linear", "step"]).default("linear"),
      // Decimal places the code-owned value is rounded to (monitor + prompt).
      precision: z.number().int().min(0).max(1).default(0),
    }),
  ),
  resourceProfile: z.object({
    id: z.string(),
    label: z.string(),
    available: z.array(z.string()),
    unavailable: z.array(z.string()),
    referralMinutes: z.number(),
  }),
  // The signature UI. A render-ready view of resourceProfile.
  constraintBoard: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      status: z.enum(["available", "unavailable", "delayed"]),
      detail: z.string(),
    }),
  ),
  actionCatalog: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      baseTimeCostMinutes: z.number(), // the CODE advances the clock by this
      requiresResource: z.string().nullable(), // unavailable resource -> refuse
      // Free-text matchers (word-boundary prefix, case-insensitive) so a
      // typed "send a cbc" registers the order. Public data — must never
      // hint at the diagnosis.
      keywords: z.array(z.string()).default([]),
    }),
  ),
  stages: z.array(StageSchema).min(1),

  // ---- SECRET from here down: never include in toPublicCase() ----
  groundTruth: z.object({
    diagnosis: z.string(),
    diagnosisLabel: z.string(),
    mimics: z.array(
      z.object({ label: z.string(), distinguisher: z.string() }),
    ),
    pitfalls: z.array(z.string()),
  }),
  scoringSignals: z.object({
    referTargetByMin: z.number(), // referral initiated before this = full marks
    forbiddenResources: z.array(z.string()),
    // Action ids that mean WAITING for a resource this profile lacks (e.g.
    // "wait for the morning sonographer"). Asking for a forbidden resource
    // once is free — waiting for one burns disease time, so it is the
    // heaviest resource-discipline penalty.
    waitActions: z.array(z.string()).default([]),
    // Mimic-exclusion orders that earn differential credit (once each, on
    // first order). Convention: points across a case sum to 15 so every
    // case scores on the same 100-point scale (see score.ts).
    differentialActions: z
      .array(
        z.object({
          actionId: z.string(),
          points: z.number(),
          label: z.string(),
        }),
      )
      .default([]),
    // Dr. Şahin's madde-5 ruling (2026-07-08): committing the irreversible
    // referral with NONE of the anyOf actions ever performed is a distinct
    // safety failure — deducted from the discipline axis, once. The label is
    // authored clinical text; score.ts appends the arithmetic.
    blindCommitPenalty: z
      .object({
        anyOf: z.array(z.string()).min(1),
        penalty: z.number(),
        label: z.string(),
      })
      .nullable()
      .default(null),
  }),
  debrief: z.object({
    goals: z.array(z.string()),
    ctContrastText: z.string(), // Profile B lives ONLY as this paragraph
  }),
  safety: z.object({
    illustrative: z.literal(true),
    redLines: z.array(z.string()),
  }),
});

export type CaseSpec = z.infer<typeof CaseSpecSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type Vitals = z.infer<typeof VitalsSchema>;

// Everything the browser is allowed to know: the opening state of the world.
// No stages (future physiology = spoiler), no groundTruth, no scoring, no
// debrief. initialVitals is S0's set — visible on the monitor at arrival.
export function toPublicCase(spec: CaseSpec) {
  return {
    id: spec.id,
    version: spec.version,
    title: spec.title,
    axis: spec.axis,
    vignette: spec.vignette,
    patient: spec.patient,
    // `drift` stays worker-only: a client that can see which vital moves as
    // a step vs a glide can read the case's discrete-event trap (the
    // false-relief pain cliff) out of the network tab before it happens.
    // `precision` is harmless display metadata and the panels need it.
    vitalsCatalog: spec.vitalsCatalog.map(({ drift, ...pub }) => pub),
    initialVitals: spec.stages[0].vitals,
    resourceProfile: spec.resourceProfile,
    constraintBoard: spec.constraintBoard,
    actionCatalog: spec.actionCatalog,
    safety: spec.safety,
  };
}

export type PublicCase = ReturnType<typeof toPublicCase>;
