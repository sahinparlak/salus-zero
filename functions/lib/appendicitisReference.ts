// SALUS Zero — Section 2 (decision-support companion): the surgeon-authored
// clinical grounding for the appendicitis / acute-abdomen consult.
//
// WORKER-ONLY. This string is injected into the consult system prompt via the
// {{REFERENCE}} token (see consultPrompt.ts) and is NEVER sent to the browser —
// same trust boundary as the hero's hidden ground truth. The companion is told
// to reason from THIS reference, not from parametric memory.
//
// ════════════════════════════════════════════════════════════════════════════
//  REFERENCE VERSION: v1 — 10 Jul 2026. The UI provenance card ("Reference
//  v1", App.tsx chat stage) claims THIS version; bump both together.
//  STATUS: VALIDATED — read through and approved by Dr. Şahin Parlak
//  (pediatric surgery), 10 Tem ("okudum, devam"). The Day-2 hard gate (plan
//  §7) is PASSED. Content provenance: ~half copied from the approved hero
//  case, book-anchored lines from the designated source chapter ([S: H&A40]
//  tags), standard paediatric values. Şahin may still revise any line — this
//  file is his voice; edits here are content-only and safe (build re-injects).
//
//  MARKER RULE: this file must contain no double-square-bracket markers.
//  `pnpm check:ref` asserts that, and `pnpm build` runs it first — a marker
//  left behind fails the build on purpose.
//
//  SOURCE BOOK (designated by Şahin, 10 Tem): Holcomb & Ashcraft's Pediatric
//  Surgery, 8th ed., Ch. 40 "Appendicitis in Children" (Criss, Deans, Minneci).
//  Lines tagged [S: H&A40] trace to that chapter — validation = check against
//  the chapter, not against memory. The chapter text itself is NOT reproduced
//  here (copyright); published instruments (PAS/Alvarado) and cited facts are.
// ════════════════════════════════════════════════════════════════════════════

export const APPENDICITIS_REFERENCE = `CLINICAL REFERENCE — POSSIBLE ACUTE APPENDICITIS / ACUTE ABDOMEN IN A CHILD
This is the grounding for your reasoning. Prefer it over recalled facts. It is a
decision aid that AUGMENTS the clinician's judgement; it never replaces it, never
issues directives, and never states drug doses. When the reference does not cover
something, say so plainly rather than inventing detail.
PRIMARY SOURCE: distilled from Holcomb & Ashcraft's Pediatric Surgery, 8th ed.,
Ch. 40 (Appendicitis in Children), selected and validated by the supervising
paediatric surgeon; lines tagged [S: H&A40] trace to that chapter.

──────────────────────────────────────────────────────────────────────────────
A) PEDIATRIC APPENDICITIS SCORE (PAS)
Components (max 10):
  • Migration of pain to the RLQ ............................ +1
  • Anorexia ............................................... +1
  • Nausea / vomiting ...................................... +1
  • Fever ≥ 38.0 °C ........................................ +1
  • Right-lower-quadrant tenderness ........................ +2
  • Cough / percussion / hop tenderness .................... +2
  • Leukocytosis (WBC ≥ 10,000/µL) ......................... +1
  • Neutrophilia (ANC > 7,500/µL) .......................... +1

Interpretation bands — per external validation [S: H&A40: rule-out ≤2, rule-in ≥7]
  • Low (0–2): appendicitis unlikely — look elsewhere, but do not close the book.
  • Equivocal (3–6): observe with serial examination; the trajectory decides.
  • High (7–10): appendicitis likely — act on it. (≥6 was highly associated with
    appendicitis in the original series; ≥7 in external validation. [S: H&A40])

Strongest single findings [S: H&A40 — systematic review, 8,605 children]: migration
of pain (LR+ ~4.8) and pain with cough/hopping (LR+ ~7.6); focal RLQ pain is the
most reliable predictor overall. No lab biomarker is specific for appendicitis.
Lab timing: WBC peaks in the first ~24 h of pain, CRP at 24–48 h; with prolonged
symptoms (>72 h) a normal WBC argues against appendicitis (single-study NPV
finding [S: H&A40] — supportive, not conclusive on its own).

NO SCORE DIAGNOSES [S: H&A40]: no scoring system reliably determines the diagnosis
without imaging — scores are triage aids for structuring judgement, and that is
exactly how this tool must present them.

AGE CAVEAT (load-bearing): PAS is validated in SCHOOL-AGE children. Under ~4 years
it is NOT reliable — treat any computed score as a weak hint only, and lean on the
surgical abdomen and the age-specific mimics in section C instead. In the youngest
children assume LESS diagnostic runway, not more: complicated (perforated)
appendicitis rates are significantly higher under 5 years and approach 90% under
1 year. [S: H&A40]
Only score the components the clinician actually gave; name which items were not
scored for missing data. A score is a help, never a verdict.

──────────────────────────────────────────────────────────────────────────────
B) ALVARADO / MANTRELS SCORE
Components (max 10) [S: H&A40, Table 40.1]:
  Migration of pain 1 · Anorexia 1 · Nausea/emesis 1 · RLQ tenderness 2 ·
  Rebound pain 1 · Fever > 37.3 °C 1 · Leukocytosis (WBC > 10,000) 2 ·
  Left shift (neutrophils > 75%) 1.
Cutoffs [S: H&A40]: < 4 → appendicitis highly unlikely (~3% when pretest
  probability ≤ 60%); at cutoff 5 in children sensitivity ~0.99 but specificity
  ~0.57 — strong for ruling OUT below 5, weak for ruling in; ≥ 7 suggests
  appendicitis.

──────────────────────────────────────────────────────────────────────────────
C) DIFFERENTIAL — MIMICS TO KEEP ALIVE   ★ ANTI-ANCHORING CORE — the heart of the tool ★
Rule: a narrowed field must be a SAFER one, not tunnel vision. Every first
assessment must surface "what else could this be / what have you not excluded"
and must WEIGHT these by the patient's age and sex. Ruling one mimic out never
rules out appendicitis.

  • Acute gastroenteritis — history + serial exam: no diarrhoea, and pain came
    FIRST and migrated/localised before vomiting. In gastroenteritis, vomiting/
    diarrhoea dominate and pain neither migrates nor localises.
    CAUTION in the young child (~3–6 y): diarrhoea does NOT exclude appendicitis —
    in younger children appendicitis more often presents WITH diarrhoea; never let
    loose stools alone close the question. [S: H&A40]
  • Acute pancreatitis — uncommon in children but a mimic: epigastric or band-like
    pain boring THROUGH to the back, worse lying flat, with persistent vomiting —
    NOT the periumbilical→RLQ march of appendicitis. Serum amylase/lipase confirms
    where available; where it is not, the pain character and the ABSENCE of
    migration/localisation are the bedside discriminators.
  • Urinary tract infection — urinalysis: nitrite negative, no bacteriuria, only a
    few WBC (sterile pyuria) is compatible with an inflamed structure lying against
    the urinary tract, NOT proof of UTI. A UTI needs bacteriuria/nitrites.
  • Constipation / faecal impaction — plain abdominal film: no faecal loading/
    fecaloma + a history of recent normal stools. The film excludes this mimic; it
    can never confirm the real diagnosis.
  • Right-lower-lobe pneumonia (referred pain) — clear visible lung bases on the
    abdominal film, normal SpO₂, no cough/focal chest finding.
  • Primary (spontaneous) bacterial peritonitis / omental infarction — rare surgical
    mimics presenting as a right-sided or diffuse acute abdomen. Neither is
    confirmable or excludable with bedside tools; both ride the SAME surgical pathway
    (transfer for surgical evaluation), so a child already being referred for possible
    appendicitis is covered. Keep them alive so the picture is not force-fit to appendicitis.

  • Testicular torsion (BOY, ANY AGE) — ALWAYS examine the scrotum in a boy with
    abdominal pain; a hard time-window, easily missed under a blanket.  • Ovarian torsion (GIRL) — sudden severe unilateral lower pain ± palpable mass;
    surgical, time-critical.  • Mesenteric adenitis — post-viral, more diffuse and less-marching RLQ pain; a
    diagnosis of relief, never a first assumption.
  Young-child surgical mimics (mandatory coverage for the 0–18 intake band):
  • Intussusception — the classic young-child surgical abdomen: intermittent
    colicky pain, a sausage-shaped mass, later currant-jelly stool.  • Malrotation / volvulus — BILIOUS (green) vomiting is a surgical emergency until
    proven otherwise; time-critical in infants/toddlers.  • Incarcerated inguinal hernia — always examine the groin; a tender irreducible
    lump.  • Meckel's diverticulum — painless rectal bleeding, or a mimic of appendicitis.
  Adolescent girl:
  • Ectopic pregnancy — in any girl of child-bearing age, a can't-miss: check a
    urine/serum pregnancy test where available before anchoring on appendicitis.
  AGE/SEX WEIGHTING: toddler → push intussusception, malrotation/volvulus forward;
  school-age (~5–12) → keep gastroenteritis and mesenteric adenitis in view as the
  common non-surgical mimics, but never let either close the question;
  adolescent girl → push ectopic and ovarian torsion forward; any boy → never skip
  the scrotal exam (testicular torsion).

──────────────────────────────────────────────────────────────────────────────
D) RED-FLAG / CAN'T-MISS CHECKLIST
Escalate / do not delay if any appear:
  • Board-like or diffuse abdominal rigidity; rebound in ALL quadrants.
  • Absent bowel sounds; toxic, lethargic, or single-word-answering child.
  • Rising HR / RR / temperature with a FALLING systolic BP; capillary refill > 3 s;
    cool hands and feet (early sepsis physiology).
  • THE FALSE-RELIEF WINDOW (dangerous): after perforation, luminal pressure drops —
    pain briefly EASES, elicited tenderness blunts, the score DIPS — while the disease
    advances. A child "looking better" at that moment is the most dangerous illusion.
    Trust the whole child and the trend, not the last complaint.

──────────────────────────────────────────────────────────────────────────────
E) THE CT-LESS, RESOURCE-LIMITED PATHWAY
  • COMMIT ON CLINICAL GROUNDS — score + serial examination, not imaging you don't have.
  • Spend the cheap tests on MIMIC-EXCLUSION, not confirmation: the focused history
    and serial exam FIRST (gastroenteritis, mesenteric adenitis, the pancreatitis
    pain-pattern), urinalysis (UTI), plain film (constipation, basal pneumonia,
    free air). A nonspecific film excludes mimics; it never confirms appendicitis.
  • Stabilise: keep NPO; IV fluids and — where local protocol supports it — IV
    antibiotics. (NO DOSES here or anywhere — the clinician sets and verifies those.)
  • NEVER let an absent test set your tempo: a CT hours away or "ultrasound in the
    morning" adds disease time and changes no decision you can make tonight.
    (Ultrasound is operator-dependent — reported sensitivity ranges ~72–95%
    [S: H&A40]; a morning sonographer may not even settle tonight's question.)

──────────────────────────────────────────────────────────────────────────────
F) REFERRAL CRITERIA
  • In a long-transfer setting, the time you START the referral is the single number
    that decides the outcome — more than any image. If the abdomen or the trend
    worries you, COMMIT EARLY; over-referral is the safe error here.
  • Commit before imaging. Supportive care buys transfer time — it is NOT a disposition.
  • While waiting: IV access, NPO, fluids, and a clear phone handover to the accepting
    centre.

──────────────────────────────────────────────────────────────────────────────
G) AGE-BANDED NORMAL VITALS
Flags an out-of-range vital for the child's age (e.g. "that HR is high for a 3-year-old").
  • Infant (<1 y):      HR 100–160 · RR 30–60 · SBP ≥ 70 · temp 36.5–37.5 °C
  • Toddler (1–3 y):    HR 90–150  · RR 24–40 · SBP ≥ 75 · temp 36.5–37.5 °C
  • Pre-school (4–5 y): HR 80–140  · RR 22–34 · SBP ≥ 80 · temp 36.5–37.5 °C
  • School-age (6–12):  HR 70–120  · RR 18–30 · SBP ≥ 85 · temp 36.5–37.5 °C
  • Adolescent (13–18): HR 60–100  · RR 12–20 · SBP ≥ 90 · temp 36.5–37.5 °C

──────────────────────────────────────────────────────────────────────────────
H) EXAM-MANOEUVRE GLOSSARY
So the tool reads the clinician's exam checkboxes correctly.
  • McBurney / RLQ tenderness — tenderness at the RLQ point of maximal appendiceal pain.
  • Rebound tenderness — pain worse on release than on pressure (peritoneal irritation).
  • Percussion tenderness — pain on gentle percussion; a gentler rebound equivalent.
  • Hop / cough test — pain on hopping or coughing; a child who won't hop is a soft sign.
  • Voluntary vs involuntary guarding — voluntary is anticipatory; involuntary (rigidity)
    is true peritonism and more ominous.
  • Psoas sign — RLQ pain on right hip extension (retrocaecal appendix).
  • Rovsing sign — RLQ pain elicited by pressing the LLQ.

──────────────────────────────────────────────────────────────────────────────
END OF REFERENCE.`;
