# docs/ — the process record

Working documents from the hackathon build, kept as evidence of how the
product was made: clinical sign-offs with a named physician, adversarial
code reviews, red-team scripts, and decision-ready plans. They are written
in Turkish (the working language of the build); one line each in English:

| File | What it is |
|---|---|
| [FELSEFE.md](FELSEFE.md) | The design philosophy: *built for the model's fallibility, not its intelligence* — the thesis, the living table of refusals in the product, and the honest-gap log: the score arithmetic that was caught living in the model, then moved into code. |
| [GUN1-KLINIK-ONAY.md](GUN1-KLINIK-ONAY.md) | Dated clinical approval log — Şahin Parlak, MD (Pediatric Surgery) reviewed and signed off the hero case's clinical content, 15/15 items, with dated addenda (incl. the 2026-07-11 ruling removing DKA from the appendicitis differential). **[Full English translation →](GUN1-KLINIK-ONAY.en.md)** |
| [GUN2-KOD-INCELEME.md](GUN2-KOD-INCELEME.md) | Day-2 core-loop code review: playtests, forgery attempts against the turn API, and the fixes they forced. |
| [GUN3-KOD-INCELEME.md](GUN3-KOD-INCELEME.md) | Day-3 review of the debrief + scoring layer: a 53-agent adversarial workflow across 6 lenses; 23 deduplicated findings, each independently verified. |
| [GUN3-SKOR-ONAY.md](GUN3-SKOR-ONAY.md) | Scoring-weights approval log — the 0–100 rubric (referral timing / resource discipline / differential workup) approved item by item by the reviewing physician, including the blind-commit penalty ruling. |
| [GUN3-RED-TEAM.md](GUN3-RED-TEAM.md) | Adversarial safety review of the consult companion, run against production: dose-baiting, scope-escape, anchoring, age-rail and prompt-injection scenarios, with observed results per scenario. |
| [GUN4-KOD-INCELEME.md](GUN4-KOD-INCELEME.md) | Day-4 review: 6-lens adversarial pass (20 agents, 14 findings, 12 confirmed) over the vitals-drift, score-decision and referral-confirm changes, plus two live end-to-end play logs. |
| [APANDISIT-COMPANION-PLANI.md](APANDISIT-COMPANION-PLANI.md) | Decision-ready plan for the consult companion (product #2): grounding contract, safety rails, locked decisions. |
| [BOLUM2-EKSIK-ANALIZI.md](BOLUM2-EKSIK-ANALIZI.md) | Honest gap inventory of the companion — what is missing, what ships this week, what is post-hackathon. |
| [GUZELLESTIRME-PLANI.md](GUZELLESTIRME-PLANI.md) | Surface redesign plan for the simulator (from a 15-agent design exploration): make the deterministic world model visible on screen. |
| [KONSULT-GUZELLESTIRME-PLANI.md](KONSULT-GUZELLESTIRME-PLANI.md) | Render-only redesign plan for the companion's instrument-panel face — plain text on the wire, the client draws the face. |
| [VAKA-URETIMI-PLANI.md](VAKA-URETIMI-PLANI.md) | Decision-ready plan for dynamic case generation (Claude as author + world engine + attending), isolated from the validated hero case. |
| [img/](img/) | Screenshots used by the top-level README. |
