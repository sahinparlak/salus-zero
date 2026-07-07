# SALUS Zero

**A clinical training simulator for medicine where nothing is available.**

Most medical training assumes a hospital that has everything. But most of the
world's children are treated where there is no CT, no ultrasound, no surgeon in
the building — only a clock and a single doctor. SALUS Zero trains
decision-making for *that* world. Its signature constraint: **you cannot order a
CT** — you decide with what the clinic actually has.

> **A new, from-scratch simulation engine built during the *Built with Claude:
> Life Sciences* hackathon — part of the broader SALUS Zero vision.**

Built solo with Claude Code by a practicing pediatric surgery resident.

---

## Status — Day 0

De-risking the spine: browser → Cloudflare Worker → Anthropic → SSE → browser,
streaming as smooth plain text. The physiology, case engine, and scored debrief
come next.

## Run locally

```bash
pnpm install
cp .dev.vars.example .dev.vars      # then paste your Anthropic API key
pnpm build                          # build the frontend into dist/
pnpm preview                        # serves dist/ + functions with your key
```

Open the printed URL and press **Run**. Without a key the endpoint streams a
local mock, so you can verify the transport before wiring the real call.

## Deploy (Cloudflare Pages)

```bash
pnpm build
pnpm exec wrangler login                              # one-time browser auth
pnpm exec wrangler pages secret put ANTHROPIC_API_KEY # paste key when prompted
pnpm deploy
```

## Clinical safety

**This is a training simulation, not medical advice.** All doses and thresholds
shown are illustrative. Clinically reviewed by Dr. Şahin Parlak (Pediatric
Surgery).

## License

[AGPL-3.0-or-later](LICENSE).
