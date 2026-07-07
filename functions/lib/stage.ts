// The physics of the simulation. Pure functions, code-owned: the clock, the
// stage, the vitals all come from here — the model never invents them.

import type { CaseSpec, Stage } from "./caseSpec";

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

// The sim ends (worst path) once the final stage has been held for a while;
// used as the clock ceiling until the disposition flow lands on Day 3.
export function maxClockOf(spec: CaseSpec): number {
  const last = [...spec.stages].sort(
    (a, b) => a.triggerAtAccumulatedDelayMin - b.triggerAtAccumulatedDelayMin,
  )[spec.stages.length - 1];
  return last.triggerAtAccumulatedDelayMin + 120;
}
