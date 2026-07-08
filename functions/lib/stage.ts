// The physics of the simulation. Pure functions, code-owned: the clock, the
// stage, the vitals all come from here — the model never invents them.

import type { CaseSpec, Stage, Vitals } from "./caseSpec";

// Clamp the sim clock into [0, maxMin]. Guards against negative or absurd
// client-supplied elapsed values before they reach the stage machine.
export function clampClock(elapsedMin: number, maxMin: number): number {
  if (!Number.isFinite(elapsedMin)) return 0;
  return Math.min(Math.max(elapsedMin, 0), maxMin);
}

// Deterministic physiology: the last stage whose trigger has been reached.
// Stages are sorted defensively so a mis-ordered case file cannot corrupt
// the progression.
export function stageOf(spec: CaseSpec, accumulatedDelayMin: number): Stage {
  const ordered = [...spec.stages].sort(
    (a, b) => a.triggerAtAccumulatedDelayMin - b.triggerAtAccumulatedDelayMin,
  );
  let current = ordered[0];
  for (const stage of ordered) {
    if (accumulatedDelayMin >= stage.triggerAtAccumulatedDelayMin) {
      current = stage;
    }
  }
  return current;
}

// The vitals the monitor shows at any minute — still 100% deterministic and
// code-owned, but alive WITHIN a stage: each vital glides linearly from its
// current stage anchor to the next stage's anchor, arriving exactly when that
// stage triggers (so the numbers are continuous across the boundary). Vitals
// authored with drift:"step" (e.g. pain, whose false-relief drop is a
// discrete perforation event) hold their anchor until the boundary instead.
// Inside the final stage every value holds. Exam findings, labs and PAS stay
// stage-stepped — only the monitor breathes.
export function vitalsAt(spec: CaseSpec, elapsedMin: number): Vitals {
  const ordered = [...spec.stages].sort(
    (a, b) => a.triggerAtAccumulatedDelayMin - b.triggerAtAccumulatedDelayMin,
  );
  const t = Math.max(elapsedMin, ordered[0].triggerAtAccumulatedDelayMin);
  let idx = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (t >= ordered[i].triggerAtAccumulatedDelayMin) idx = i;
  }
  const current = ordered[idx];
  const next = ordered[idx + 1];
  const span = next
    ? next.triggerAtAccumulatedDelayMin - current.triggerAtAccumulatedDelayMin
    : 0;
  const frac =
    next && span > 0
      ? Math.min((t - current.triggerAtAccumulatedDelayMin) / span, 1)
      : 0;

  const out = { ...current.vitals };
  for (const v of spec.vitalsCatalog) {
    const from = current.vitals[v.key];
    const value =
      next && v.drift === "linear"
        ? from + (next.vitals[v.key] - from) * frac
        : from;
    const factor = 10 ** v.precision;
    out[v.key] = Math.round(value * factor) / factor;
  }
  return out;
}

// The sim ends (worst path) once the final stage has been held for a while;
// used as the clock ceiling until the disposition flow lands on Day 3.
export function maxClockOf(spec: CaseSpec): number {
  const last = [...spec.stages].sort(
    (a, b) => a.triggerAtAccumulatedDelayMin - b.triggerAtAccumulatedDelayMin,
  )[spec.stages.length - 1];
  return last.triggerAtAccumulatedDelayMin + 120;
}
