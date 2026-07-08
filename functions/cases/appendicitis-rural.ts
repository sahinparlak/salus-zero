// SALUS Zero — hero case: pediatric appendicitis, rural night profile.
// WORKER-ONLY. Drafted + adversarially reviewed by a 7-agent workflow on
// 2026-07-08; every clinical value is a DRAFT pending Dr. Şahin Parlak's
// sign-off (see docs/GUN1-KLINIK-ONAY.md). The public id/title must never
// hint at the diagnosis — only this file's name may, because it never
// leaves the worker bundle.
//
// Threshold semantics (spec rule): all comparisons are INCLUSIVE — a vital
// >= criticalHigh or <= criticalLow renders critical; a stage triggers when
// accumulated delay >= triggerAtAccumulatedDelayMin; referral initiated at
// t <= referTargetByMin scores full credit.

import { CaseSpecSchema, type CaseSpec } from "../lib/caseSpec";

export const appendicitisRural: CaseSpec = CaseSpecSchema.parse({
  id: "peds-abd-rural-a",
  version: "0.1.0",
  domain: "pediatric_surgery",
  axis: "diagnosis",
  title: "02:00, District Hospital — Boy, 7, Abdominal Pain",
  vignette:
    "Doctor, forgive us for coming at this hour — the road here is long. It " +
    "started yesterday morning: Emir woke up saying his tummy hurt and " +
    "pressed his hand here, on his belly button. He skipped his football " +
    "game — he never skips it. In the afternoon he said the pain had moved " +
    "down to his right side, and in the evening he threw up once and " +
    "stopped eating — he wouldn't even touch his bread. Tonight he only got " +
    "worse; he won't let anyone near his right side, he pushed my hand " +
    "away. In the car he cried at every bump. He never cries, doctor.",
  patient: { name: "Emir", ageYears: 7, sex: "male", weightKg: 23 },
  vitalsCatalog: [
    { key: "HR", label: "Heart rate", unit: "bpm", normalLow: 70, normalHigh: 110, criticalLow: 60, criticalHigh: 140 },
    { key: "RR", label: "Respiratory rate", unit: "breaths/min", normalLow: 18, normalHigh: 25, criticalLow: 10, criticalHigh: 40 },
    { key: "TempC", label: "Temperature", unit: "°C", normalLow: 36.5, normalHigh: 37.5, criticalLow: 35, criticalHigh: 39.5 },
    { key: "SBP", label: "Systolic BP", unit: "mmHg", normalLow: 90, normalHigh: 115, criticalLow: 84, criticalHigh: null },
    { key: "SpO2", label: "SpO₂", unit: "%", normalLow: 95, normalHigh: 100, criticalLow: 90, criticalHigh: null },
    { key: "pain", label: "Pain score", unit: "/10", normalLow: 0, normalHigh: 3, criticalLow: null, criticalHigh: 8 },
  ],
  resourceProfile: {
    id: "rural_night_A",
    label: "Rural district hospital, night",
    available: [
      "xray_abd",
      "cbc",
      "urinalysis",
      "glucose_ketone",
      "iv_fluids",
      "iv_antibiotics",
      "analgesia",
      "referral",
    ],
    unavailable: ["ct_abd", "us_abd", "surgeon_onsite", "pediatric_icu"],
    // Single transfer semantic everywhere: the ambulance is dispatched from
    // the city at activation and reaches THIS hospital ~240 min later.
    referralMinutes: 240,
  },
  constraintBoard: [
    { key: "xray_abd", label: "Abdominal X-ray", status: "available", detail: "plain film — technician on call" },
    { key: "cbc", label: "CBC", status: "available", detail: "night lab — ~40 min turnaround" },
    { key: "urinalysis", label: "Urinalysis", status: "available", detail: "bedside dipstick + microscopy" },
    { key: "glucose_ketone", label: "Glucose + Ketones", status: "available", detail: "bedside strips — result in seconds" },
    { key: "iv_fluids", label: "IV Fluids", status: "available", detail: "crystalloids stocked on the ward" },
    { key: "iv_antibiotics", label: "IV Antibiotics", status: "available", detail: "ward stock — ready to hang" },
    { key: "analgesia", label: "Analgesia", status: "available", detail: "IV analgesia on hand" },
    { key: "ct_abd", label: "CT Scan", status: "unavailable", detail: "no scanner here — nearest hours away" },
    { key: "us_abd", label: "Ultrasound", status: "unavailable", detail: "no sonographer tonight — earliest tomorrow morning" },
    { key: "surgeon_onsite", label: "On-site Surgeon", status: "unavailable", detail: "none tonight — patient must travel" },
    { key: "pediatric_icu", label: "Pediatric ICU", status: "unavailable", detail: "tertiary center only" },
    { key: "referral", label: "Referral / Ambulance", status: "delayed", detail: "ambulance from the city — ≈4 h" },
  ],
  // keywords: free-text matchers (word-boundary PREFIX, case-insensitive) —
  // chosen to avoid false positives ("us", "surgery" alone are too broad)
  // and to never hint at the diagnosis. A few Turkish synonyms included.
  actionCatalog: [
    { id: "history_exam", label: "Take history & perform focused physical exam", baseTimeCostMinutes: 15, requiresResource: null,
      keywords: ["examin", "physical exam", "palpat", "auscultat", "take a history", "take history", "muayene"] },
    { id: "cbc", label: "Order CBC", baseTimeCostMinutes: 40, requiresResource: "cbc",
      keywords: ["cbc", "blood count", "hemogram", "full blood", "white count", "wbc", "tam kan"] },
    { id: "urinalysis", label: "Order urinalysis (dipstick + microscopy)", baseTimeCostMinutes: 30, requiresResource: "urinalysis",
      keywords: ["urinalysis", "urine test", "urine sample", "urine dip", "dipstick", "urine micro", "idrar"] },
    { id: "glucose_ketone", label: "Check capillary glucose + urine ketones (bedside)", baseTimeCostMinutes: 5, requiresResource: "glucose_ketone",
      keywords: ["glucose", "ketone", "blood sugar", "fingerstick", "finger prick", "glukoz", "keton"] },
    { id: "xray_abd", label: "Order abdominal X-ray (portable)", baseTimeCostMinutes: 25, requiresResource: "xray_abd",
      keywords: ["x-ray", "xray", "x ray", "radiograph", "plain film", "abdominal film", "grafi"] },
    { id: "iv_fluids", label: "Start IV fluids", baseTimeCostMinutes: 15, requiresResource: "iv_fluids",
      keywords: ["fluid", "bolus", "saline", "ringer", "crystalloid", "drip", "hidrasyon"] },
    { id: "iv_antibiotics", label: "Start IV antibiotics", baseTimeCostMinutes: 15, requiresResource: "iv_antibiotics",
      keywords: ["antibiotic", "abx", "antibiyotik", "ceftriaxone", "cefotaxime", "metronidazole", "ampicillin", "gentamicin", "piperacillin", "amoxicillin", "seftriakson", "metronidazol"] },
    { id: "analgesia", label: "Give analgesia", baseTimeCostMinutes: 10, requiresResource: "analgesia",
      keywords: ["analgesi", "pain relief", "painkiller", "pain med", "paracetamol", "acetaminophen", "ibuprofen", "morphine", "ağrı kes"] },
    { id: "npo", label: "Make NPO (nothing by mouth)", baseTimeCostMinutes: 2, requiresResource: null,
      keywords: ["npo", "nil by mouth", "nothing by mouth", "nil per os", "oral alım"] },
    { id: "reexamine_observe", label: "Re-examine / observe", baseTimeCostMinutes: 30, requiresResource: null,
      keywords: ["observ", "re-examine", "reexamine", "recheck", "reassess", "serial exam", "gözle"] },
    // The trap the case is built to teach (pitfall #6 verbatim): committing
    // to imaging that only exists in the morning. 300 min = the sonographer
    // arrives ~07:00 from a 02:00 start; taken after any realistic opening
    // play it lands the player inside S2's false-relief window.
    { id: "await_morning_us", label: "Wait for the morning sonographer", baseTimeCostMinutes: 300, requiresResource: null,
      keywords: ["morning ultrasound", "morning sonograph", "morning scan", "until morning", "wait for morning", "sabah ultrason", "sabahı bekle"] },
    { id: "order_ct", label: "Order abdominal CT", baseTimeCostMinutes: 15, requiresResource: "ct_abd",
      keywords: ["ct", "tomography", "cat scan", "tomografi"] },
    { id: "request_us", label: "Request abdominal ultrasound", baseTimeCostMinutes: 15, requiresResource: "us_abd",
      keywords: ["ultrasound", "sonograph", "usg", "u/s", "ultrason"] },
    { id: "call_surgeon_onsite", label: "Call surgeon to come on site", baseTimeCostMinutes: 10, requiresResource: "surgeon_onsite",
      keywords: ["surgeon", "surgical consult", "cerrah"] },
    // NOTE: these keywords only raise a pendingReferral CONFIRM in the UI —
    // they never execute the case-ending action (loop.ts). Bare "112" was
    // removed: it collided with S0's heart rate typed as free text.
    { id: "start_referral", label: "START REFERRAL CHAIN", baseTimeCostMinutes: 15, requiresResource: "referral",
      keywords: ["refer", "transfer", "ambulance", "call 112", "tertiary", "sevk", "evacuat"] },
  ],
  stages: [
    {
      id: "S0",
      triggerAtAccumulatedDelayMin: 0,
      vitals: { HR: 112, RR: 24, TempC: 37.8, SBP: 104, SpO2: 98, pain: 6 },
      examFindings:
        "Localized tenderness in the right lower quadrant with voluntary " +
        "guarding; abdomen otherwise soft; no rebound tenderness; bowel " +
        "sounds present; non-toxic appearance; walks with a slight stoop " +
        "favoring the right side. Gentle percussion over the right lower " +
        "quadrant makes him wince and push your hand away; asked to hop on " +
        "the spot, he attempts once, clutches his right side, and will not " +
        "try again.",
      labs: {
        cbc: "WBC 10,800/µL (neutrophils 65%, ANC ≈7,000/µL), Hgb 12.6 g/dL, Plt 262,000/µL.",
        urinalysis:
          "Dipstick: specific gravity 1.020, leukocyte esterase trace, " +
          "nitrite negative, glucose negative, ketones negative. " +
          "Microscopy: 3–5 WBC/hpf, no bacteria, no RBC.",
        glucose_ketone: "Capillary glucose 96 mg/dL (normal). Urine ketones: negative.",
        xray_abd:
          "Supine and upright abdominal films: nonspecific bowel gas " +
          "pattern; no free air under the diaphragm; no air–fluid levels; " +
          "no fecal loading or fecaloma; visible lung bases clear with no " +
          "right-basal consolidation.",
      },
      pas: 8,
      pasBreakdown:
        "Migration of pain 1 + anorexia 1 + nausea/vomiting 1 + fever " +
        "≥38.0°C 0 (T 37.8) + RLQ tenderness 2 + cough/percussion/hop " +
        "tenderness 2 (percussion wince, hop attempted once and refused) + " +
        "WBC ≥10,000/µL 1 (10,800) + neutrophilia ANC >7,500/µL 0 " +
        "(ANC ≈7,000) = 8",
      narrativeCue:
        "Emir lies very still on the stretcher and pulls away when you " +
        "approach his right side. His mother repeats that the pain 'moved " +
        "down' from around his belly button yesterday afternoon, that he " +
        "vomited once in the evening, and that he cried at every bump in " +
        "the car. He refuses the water she offers. He is frightened but " +
        "answers your questions in a small voice.",
    },
    {
      id: "S1",
      triggerAtAccumulatedDelayMin: 120,
      vitals: { HR: 120, RR: 26, TempC: 38.3, SBP: 100, SpO2: 98, pain: 7 },
      examFindings:
        "Increased focal right-lower-quadrant tenderness; rebound " +
        "tenderness emerging on gentle percussion; guarding now less " +
        "clearly voluntary; child lies still with the right hip slightly " +
        "flexed; alert but tiring; refuses to attempt hopping at all, " +
        "protecting his right side with his hand.",
      labs: {
        cbc: "WBC 14,200/µL (neutrophils 80%, ANC ≈11,400/µL), Hgb 12.8 g/dL, Plt 255,000/µL.",
        urinalysis:
          "Dipstick: specific gravity 1.025, leukocyte esterase 1+, " +
          "nitrite negative, glucose negative, ketones 1+. Microscopy: " +
          "5–10 WBC/hpf, no bacteria, no RBC.",
        glucose_ketone: "Capillary glucose 102 mg/dL (normal). Urine ketones: small (1+).",
        xray_abd:
          "Mild localized ileus with a few modestly dilated small-bowel " +
          "loops in the right lower abdomen; no free air; no obstructive " +
          "air–fluid levels; no fecal loading; visible lung bases clear.",
      },
      pas: 10,
      pasBreakdown:
        "Migration of pain 1 + anorexia 1 + nausea/vomiting 1 + fever " +
        "≥38.0°C 1 (T 38.3) + RLQ tenderness 2 + cough/percussion/hop " +
        "tenderness 2 (rebound elicited on gentle percussion; hop refused " +
        "for pain) + WBC ≥10,000/µL 1 (14,200) + neutrophilia ANC " +
        ">7,500/µL 1 (ANC ≈11,400) = 10",
      narrativeCue:
        "Emir is quieter now. He keeps his right hip flexed and cries when " +
        "the stretcher is bumped. Letting go hurts him more than pressing " +
        "does. His mother strokes his hair and asks why he is getting " +
        "warmer instead of better. He has stopped asking to go home; he " +
        "just wants to be left alone, completely still.",
    },
    {
      id: "S2",
      triggerAtAccumulatedDelayMin: 300,
      vitals: { HR: 130, RR: 30, TempC: 38.8, SBP: 96, SpO2: 97, pain: 5 },
      examFindings:
        "He reports that the pain has eased. Direct palpation of the right " +
        "lower abdomen is still tender, but the sharply localized point of " +
        "the earlier exams is harder to pin down — tenderness now extends " +
        "vaguely across the lower abdomen; guarding is present but feels " +
        "softer than before; percussion no longer draws the wince it did; " +
        "bowel sounds reduced; he is flushed and hot, heart racing and " +
        "breathing fast even as he says he feels better.",
      labs: {
        cbc: "WBC 16,900/µL (neutrophils 86%, ANC ≈14,500/µL), Hgb 12.9 g/dL, Plt 248,000/µL.",
        urinalysis:
          "Dipstick: specific gravity 1.025, leukocyte esterase 1+, " +
          "nitrite negative, glucose negative, ketones 2+. Microscopy: " +
          "10–15 WBC/hpf, no bacteria, no RBC.",
        glucose_ketone: "Capillary glucose 108 mg/dL (normal). Urine ketones: moderate (2+).",
        xray_abd:
          "Paucity of bowel gas in the right iliac fossa with a few " +
          "dilated sentinel small-bowel loops; gas pattern otherwise " +
          "nonspecific; no definite free air; no fecal loading; visible " +
          "lung bases clear.",
      },
      pas: 8,
      pasBreakdown:
        "Migration of pain 1 + anorexia 1 + nausea/vomiting 1 + fever " +
        "≥38.0°C 1 (T 38.8) + RLQ tenderness 2 (still tender to direct " +
        "palpation) + cough/percussion/hop tenderness 0 (elicited " +
        "tenderness genuinely blunted in the false-relief window — the " +
        "score dips while the disease advances) + WBC ≥10,000/µL 1 " +
        "(16,900) + neutrophilia ANC >7,500/µL 1 (ANC ≈14,500) = 8",
      narrativeCue:
        "Emir says, 'it doesn't hurt as much anymore.' His mother looks up " +
        "with hope and asks whether they can finally go home. His cheeks " +
        "are flushed and his skin is hot to the touch; on the monitor the " +
        "numbers keep climbing even as he says he feels better.",
    },
    {
      id: "S3",
      triggerAtAccumulatedDelayMin: 480,
      vitals: { HR: 142, RR: 34, TempC: 39.6, SBP: 88, SpO2: 94, pain: 9 },
      examFindings:
        "Toxic-appearing, lethargic child answering in single words; " +
        "diffuse abdominal rigidity with a board-like wall; percussion " +
        "tenderness in all quadrants; absent bowel sounds; hot trunk with " +
        "cool hands and feet; capillary refill about 3 seconds; breathing " +
        "rapid and shallow; pulse fast and thready. He no longer reports " +
        "pain himself — the pain score is taken observationally, from his " +
        "face, his posture, and the way he moans when the bed is touched.",
      labs: {
        cbc:
          "WBC 21,400/µL (neutrophils 90%, ANC ≈19,300/µL) with toxic " +
          "granulation reported by the lab; Hgb 13.1 g/dL, Plt 240,000/µL.",
        urinalysis:
          "Dipstick: specific gravity 1.030, leukocyte esterase 1+, " +
          "nitrite negative, glucose negative, ketones 2+. Microscopy: " +
          "10–15 WBC/hpf, no bacteria.",
        glucose_ketone: "Capillary glucose 118 mg/dL (normal). Urine ketones: moderate (2+).",
        xray_abd:
          "Diffuse small-bowel dilatation with a generalized ileus " +
          "pattern; no pneumoperitoneum identified; no fecal loading; " +
          "visible lung bases clear.",
      },
      pas: null,
      pasBreakdown:
        "Not scored (pas = null). Authoring/review note: the score is a " +
        "diagnostic aid for equivocal presentations; this child is now " +
        "toxic with diffuse rigidity and early sepsis physiology — beyond " +
        "scoring. The disposition question was settled hours ago; only the " +
        "transfer clock matters now.",
      narrativeCue:
        "Emir is lethargic, eyes half-open. His skin burns to the touch " +
        "and his lips are dry; any movement of the bed makes him moan. He " +
        "no longer complains — he has gone quiet in the way sick children " +
        "go quiet. His mother is crying in the corridor, asking why this " +
        "happened.",
    },
  ],
  groundTruth: {
    diagnosis: "acute_appendicitis",
    diagnosisLabel:
      "Acute appendicitis — advanced presentation at the early-perforation threshold",
    mimics: [
      {
        label: "Diabetic ketoacidosis (DKA)",
        distinguisher:
          "Bedside capillary glucose + urine ketones (a 5-minute test): " +
          "glucose is normal throughout, which rules out DKA by itself. " +
          "The ketones that rise as the night wears on are starvation " +
          "ketones from vomiting and poor intake — moderate ketones with a " +
          "normal glucose mean starvation, not DKA. DKA can present as a " +
          "pseudo-acute abdomen, and operating on a DKA abdomen is a " +
          "classic catastrophe — this is the cheapest life-saving test in " +
          "the room.",
      },
      {
        label: "Acute gastroenteritis",
        distinguisher:
          "History and serial exam: no diarrhea, and the pain came FIRST " +
          "and migrated to the right lower quadrant before the single " +
          "vomit. In gastroenteritis, vomiting and diarrhea dominate and " +
          "pain neither migrates nor localizes.",
      },
      {
        label: "Urinary tract infection",
        distinguisher:
          "Urinalysis: nitrite negative, no bacteriuria, only a few white " +
          "cells — a sterile-pyuria pattern that is compatible with an " +
          "inflamed structure lying against the urinary tract, not " +
          "evidence of UTI. A UTI needs bacteriuria/nitrites to carry this " +
          "picture.",
      },
      {
        label: "Constipation / fecal impaction",
        distinguisher:
          "Abdominal X-ray: no fecal loading or fecaloma, plus a history " +
          "of recent normal stools. The film can exclude this mimic even " +
          "though it can never confirm the real diagnosis.",
      },
      {
        label: "Right-lower-lobe pneumonia (referred abdominal pain)",
        distinguisher:
          "The abdominal film's visible lung bases are clear, SpO₂ is " +
          "normal, and there is no cough or focal chest finding — basal " +
          "pneumonia masquerading as belly pain is off the table with " +
          "tools already in hand.",
      },
    ],
    pitfalls: [
      "Sterile pyuria (trace-to-1+ leukocyte esterase, a few WBC/hpf, nitrite negative) does NOT exclude the diagnosis — labeling it 'UTI' and reaching for oral antibiotics is a classic delay.",
      "Rising urine ketones with a NORMAL capillary glucose read as starvation from vomiting and poor intake, not DKA — do not let the ketone line restart the metabolic workup.",
      "Analgesia does NOT mask the surgical abdomen — withholding pain relief 'so the exam stays reliable' is outdated dogma; modern evidence says treat the pain.",
      "IV fluids improve the numbers, not the disease — a heart rate that falls after a bolus is resuscitation working, not the child getting better.",
      "The transient false-relief window after perforation (luminal pressure drops, pain briefly eases, elicited tenderness blunts, the score dips) is misread as improvement — the child 'looking better' at that moment is the most dangerous illusion in the case.",
      "Waiting for unavailable imaging — 'ultrasound in the morning' or transfer-for-CT-first — burns the only resource that matters: time. Commit on clinical grounds and start the referral chain immediately.",
      "A nonspecific abdominal X-ray neither confirms nor excludes — its job here is mimic exclusion (fecal loading, basal pneumonia, free air), nothing more.",
      "A single score is weaker than its trajectory — serial examination beats any one number, and a dip during observation is not reassurance.",
    ],
  },
  // Scoring weights are a DRAFT pending Dr. Şahin's sign-off, like every
  // clinical value in this file (see docs/GUN3-SKOR-ONAY.md).
  scoringSignals: {
    referTargetByMin: 90,
    forbiddenResources: ["ct_abd", "us_abd"],
    waitActions: ["await_morning_us"],
    differentialActions: [
      { actionId: "glucose_ketone", points: 6, label: "DKA excluded — capillary glucose and ketones checked" },
      { actionId: "urinalysis", points: 3, label: "UTI mimic worked up — urinalysis" },
      { actionId: "xray_abd", points: 3, label: "Constipation and basal pneumonia excluded — abdominal film" },
      { actionId: "cbc", points: 3, label: "Inflammatory trajectory quantified — CBC" },
    ],
  },
  debrief: {
    goals: [
      "Start the referral chain the moment clinical suspicion commits — in a setting where the ambulance takes four hours to reach you, time-to-referral-initiation is the single number that decides the outcome.",
      "Never let an unavailable test set your tempo: waiting for a CT or the morning sonographer adds hours of disease progression and changes no decision you can make tonight.",
      "Spend the cheapest tests first: capillary glucose excludes DKA — the metabolic mimic of the acute abdomen that turns an unnecessary operation into a catastrophe — and rising ketones with a normal glucose read as starvation from vomiting, not diabetes.",
      "Distrust sudden improvement: a transient easing of pain during a worsening course can mark progression, not recovery — reassess the whole child, not the last complaint.",
      "Treat the disease, not the number: IV fluids and antibiotics make the monitor look better while the underlying process advances; supportive care buys transfer time — it is not a disposition.",
    ],
    ctContrastText:
      "In a resourced pediatric center, this night runs on a different " +
      "playbook: an ultrasound within the hour confirms the diagnosis, and " +
      "the child undergoes appendectomy in an operating room down the " +
      "corridor before dawn — confirm first, then operate. Here there was " +
      "no sonographer, no CT, and no surgeon in the building, so the " +
      "correct move was to commit on clinical grounds alone: score the " +
      "risk, stabilize, and — where local protocol supports it — start IV " +
      "antibiotics, then put the ambulance on the road without waiting for " +
      "a picture. That pathway is not the optimum — it is the best " +
      "possible, and they are not the same discipline. Textbooks teach the " +
      "first; the doctor alone at 02:00 has to know the second.",
  },
  safety: {
    illustrative: true,
    redLines: [
      "no on-site definitive-surgery pathway",
      "no drug doses anywhere",
      "hidden diagnosis never revealed outside the debrief call",
      "real-patient escape hatch always active",
    ],
  },
});
