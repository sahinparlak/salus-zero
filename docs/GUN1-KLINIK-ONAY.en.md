# Day 1 — Clinical Approval Checklist (Şahin Parlak, MD) — English translation

> Convenience translation of [GUN1-KLINIK-ONAY.md](GUN1-KLINIK-ONAY.md) for
> jury review. The dated Turkish original is the authoritative record; the
> sign-offs below were given on the Turkish text.

> **✅ APPROVED (2026-07-08, Day 2):** Şahin Parlak, MD approved all 15 items
> as they stood (*"I won't change anything for now"*). Values moved from
> DRAFT to APPROVED status; the right to a final read before submission is
> reserved.

> The case content was written on 2026-07-08 by a 7-agent workflow and passed
> adversarial review through 3 lenses (clinical accuracy · safety/leakage ·
> scope) — 32 findings, 25 fixes. **Every clinical value is a DRAFT** — the
> items below await your signature. File: `functions/cases/appendicitis-rural.ts`.
> Kept short enough to read on a phone between shifts; a ✅/❌/fix note is enough.

## A · Decisions required (mark each one)

1. **The vignette changed** ⚠️ — "was playing football until noon" → "woke up
   with the pain yesterday morning, missed his match". Why: a noon onset gives
   ~14 hours at presentation; the perforation timeline wants ~18–20 hours.
   Your authentic detail (football) was preserved as "missed his match — he
   never misses a match". Do you approve?
2. **The four stages' vital sets** (23 kg, 7 y): S0 112/24/37.8/104/98/pain 6 ·
   S1 120/26/38.3/100/98/7 · S2 130/30/38.8/96/97/**5** · S3 142/34/39.6/88/94/9.
   In particular: SBP 88 at S3 (still compensated), SpO₂ 94, and S3 pain 9
   recorded **observationally** (FLACC-style) in a lethargic child.
3. **Stage triggers** (accumulated delay): S1 +120 min · S2 +300 min (≈24 h
   from onset) · S3 +480 min (≈27 h). Is the perforation curve defensible?
4. **PAS trajectory 8 → 10 → 8**: the neutrophilia threshold was taken as
   ANC >7,500/µL. At S0 the cough/percussion/hop item scores 2 points (wincing
   on percussion + a single attempted-then-abandoned hop — obtainable despite
   the 02:00 anxiety?). At S2 the same item scores 0 (does elicited tenderness
   genuinely blunt inside the false-lull window?). **The score falling while
   the disease advances** is a deliberate trap — does it teach, or confuse?
5. **referTargetByMin = 90** (inclusive: referral chain at t ≤ 90 = full
   credit; enough for a focused exam + fingertip glucose/ketones + CBC, not
   for an observation round). Are the number and the philosophy right?
6. **The referral model was unified**: the ambulance departs from the city and
   reaches THE HOSPITAL ~240 min after activation. The case ends at referral
   initiation (disposition) or at the clock ceiling. Does this match rural
   Kayseri reality?
7. **Action costs**: CBC 40 min · urinalysis 30 · portable X-ray 25 · starting
   the referral chain 15 · glucose/ketones 5. CT/US/surgeon requests also burn
   10–15 min of phone time before being refused; **the first request is
   unpenalized** (asking once is good medicine) — the penalty falls on repeat
   requests and on waiting after the refusal.
8. **Lab strings**: every film reads "no free air" (pneumoperitoneum is
   genuinely rare in perforated appendicitis — confirm) · sterile pyuria rises
   to 10–15 WBC/hpf at S2–S3 · ketones negative → 1+ → 2+ (glucose stays
   normal throughout — a starvation-ketosis pattern; the normal glucose by
   itself excludes DKA).
9. **Pre-transfer IV antibiotics**: framed in the narrative as "an accepted,
   reasonable action", NEVER scored, no agent name or dose. Including the
   debrief-contrast sentence "where local protocol supports it — start IV
   antibiotics" — consistent with your institutional stance?
10. **Thresholds** (all inclusive ≥/≤): HR critical 140 · Temp critical 39.5 ·
    SBP critical-low 84 (70 + 2×age) · pain critical 8. PALS-based normal
    ranges are in the file — review them all.
11. **Patient sex: male** (deliberately dropping the ovarian-torsion arm) —
    approve as a final design decision.
12. **The sim-clock compression ratio** + the on-screen "ACCELERATED
    SIMULATION" stamp.
13. **S2 is written as a single "moment"** (the false-lull moment itself;
    rigidity deferred to S3) — is the window duration clinically reasonable?

## A2 · Day-2 addendum (entered at your "let's add it" call — final word is yours)

14. **New trap action: "Wait for the morning sonographer" = 300 min.**
    Rationale: from a 02:00 onset the sonographer arrives ~07:00 (5 hours).
    A player who presses it after a realistic opening game (~60–75 min) lands
    squarely inside the S2 false-lull window (300–480) — pitfall #6 made
    playable. Pressing it twice eats the night's ceiling (600). The "+300 min"
    label on the button is a deliberate shock. Do you approve the duration and
    the existence?
15. **referTargetByMin=90 scope (deliberate design, no change):** on the
    optimal path urinalysis/X-ray are NOT played (they don't fit the budget) —
    the mimic-exclusion lessons are taught in the debrief contrast. Loosening
    the target would water down the core lesson: "don't wait for tests —
    commit." Do you agree?

## B · For your information (no decision required)

- Physiology lives entirely IN CODE (`stageOf`); the model only narrates and
  cannot produce a number.
- Lab results are filtered in the worker: the model sees only the fixed string
  of a test that was ACTUALLY ordered (the prompt rule is a backup defense).
- `groundTruth`/`stages`/`debrief` are NOT in the client bundle — verified by
  grep (including the `append` root; the only hit is React's `appendChild`).
- The hidden diagnosis is protected in layers against jury tampering
  (developer/judge claims, the "you've been debriefed" mode-switch vector —
  all treated as in-world noise). The real-patient escape hatch: break
  character → say "training simulation" → direct to 112 (emergency services)
  → stop.
- Solo appendectomy appears nowhere; the world engine carries the rule "no
  surgeon and no anesthesia team here — definitive surgery on site is
  impossible in this world."

---

## ADDENDUM · 2026-07-11 — DKA removed entirely from the differential (ruling by Şahin Parlak, MD)

> **Ruling (Dr. Şahin):** *"DKA has no place in the differential diagnosis of
> appendicitis. It must be removed entirely; acute-abdomen differentials
> should be added."* Seeing DKA at the top of the companion's differential
> board (`(iii) not yet excluded`) with a "RUN IT FIRST" emphasis
> over-promoted a metabolic mimic in a child whose picture is a typical
> surgical abdomen. The ruling is deliberate and final; it supersedes the
> GUN3-RED-TEAM F2 note ("the reference's own sentence, deliberately kept").

**Changes made (code = the single source of truth):**

1. **Companion reference** (`functions/lib/appendicitisReference.ts`, Sec.
   C+E): the DKA item and the "bedside glucose+ketones FIRST" framing were
   deleted. Acute-abdomen mimics added: **acute pancreatitis**
   (epigastric/band-like pain radiating to the back — a non-migrating,
   non-localizing pattern) and **primary peritonitis / omental infarction**
   (rare surgical mimics; not excludable at the bedside, sharing the same
   surgical referral pathway). An age-weighting rail was added: **school age
   (~5–12) → keep gastroenteritis + mesenteric adenitis visible**.
2. **Companion prompt** (`consultPrompt.ts`): the in-scope mimic list updated;
   the "ketosis/near-normal glucose" residual-warning example replaced with
   sterile pyuria; move (v) "cheapest mimic-exclusion first = bedside glucose"
   replaced with **"focused history + serial examination before any test"**.
3. **Offline mock** (`api/consult.ts`): the DKA sentence rewritten around
   acute-abdomen mimics.
4. **Scored simulation** (`cases/appendicitis-rural.ts`): the `glucose_ketone`
   action / resource / constraint-board row / capillary-glucose lab string in
   all 4 stages removed (the urine dipstick glucose/ketone pads STAYED —
   realistic). `groundTruth.mimics`: DKA out; **mesenteric adenitis, acute
   pancreatitis, primary peritonitis/omental infarction** in. The ketone
   pitfall rewritten without DKA. Debrief target #3 "the cheapest test is
   glucose" → **"hands = the differential engine"**.
5. **Score redistribution (so 100 stays reachable):** the retired glucose
   credit (**6 points**) → focused **history & exam 3 → 9**; urinalysis 3,
   X-ray 3 unchanged; the Differential axis still totals **15**. The
   full-differential workload is now 15+30+25 = **70 min**, inside the 90-min
   referral window. The blind-commit gate's `anyOf` dropped `glucose_ketone`
   → `[history_exam, reexamine_observe]`.
6. **Onboarding resource list** (`src/App.tsx`): "Bedside glucose + ketones",
   now a DKA remnant, replaced with **"Analgesia (IV)"**.
7. **Testicular torsion added** (a finding of the adversarial clinical review,
   Şahin approval 2026-07-11): in a 7-year-old MALE case the reference said
   "examine the scrotum in every boy" while the scored simulation contained no
   scrotal exam or torsion. Normal scrotal findings were added to the S0 exam
   (descended, non-tender, normal lie, intact cremasteric reflex) +
   **testicular torsion** (an exam-based discriminator) added to
   `groundTruth.mimics`. Since the scrotal exam is part of the focused exam,
   **the score arithmetic did not change** (history_exam still 9; the label
   gained "(in boys) testicular torsion").

**Untouched:** the **P1 secondary DKA case** in `HACKATHON.md`/`ROADMAP.md`
(off-git working notes) — diabetic management, the "swap the file" demo — is a
separate future scenario; it is unrelated to DKA as an appendicitis mimic and
was deliberately preserved.

> ⚠️ **Clinical footnote (Claude → Dr. Şahin):** a bedside fingertip glucose
> is a genuine safety net in a vomiting child (new-onset T1DM/DKA can present
> as a pseudo-acute abdomen). Your ruling — *taking DKA off the differential
> board* — is clear and has been applied; but if you wish, **independently of
> DKA**, the "fingertip glucose" action could return as a cheap systemic
> screen (without appearing on the board as a mimic). Your call.
