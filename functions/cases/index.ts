// Worker-only case registry. Adding a disease = adding a spec file here.
import type { CaseSpec } from "../lib/caseSpec";
import { appendicitisRural } from "./appendicitis-rural";

const cases: Record<string, CaseSpec> = {
  [appendicitisRural.id]: appendicitisRural,
};

export const DEFAULT_CASE_ID = appendicitisRural.id;

export function getCase(id: string): CaseSpec | undefined {
  // Own-property check: a plain lookup would resolve prototype keys
  // ("__proto__", "toString", …) to truthy junk and 500 downstream.
  return Object.hasOwn(cases, id) ? cases[id] : undefined;
}
