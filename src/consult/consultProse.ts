// ── The consult format contract, parsed CLIENT-SIDE. The model keeps
// streaming plain prose (nothing structured on the wire); this module
// extracts the structure the UI draws as instruments — "(iii) Title:" move
// lines, "- " bullets, "1." steps, "= N/10" score lines. Same philosophy as
// the hero: the model narrates, the instruments are drawn by code. Parsing
// runs on the full accumulated text every render, so it is streaming-safe.
// Pure functions, no React — unit-tested in tests/consultProse.test.ts.

export interface ProseBlock {
  kind: "para" | "bullet" | "step";
  text: string;
  n?: number;
}
export interface ProseSection {
  num?: string;
  title?: string;
  blocks: ProseBlock[];
  scores: { name: string; value: number }[];
}

export const MOVE_LINE_RE = /^\*{0,2}\((i{1,3}|iv|vi?)\)\*{0,2}\s*(.*)$/;
// Global on purpose: both scores sometimes share one line ("PAS 8/10,
// Alvarado 7/10") — a first-match-only scan would feed the wrong meter.
// lastIndex is reset before every scan below; never exec these elsewhere.
export const SCORE_LINE_RE =
  /\b(PAS|Alvarado)\b[^\n]*?=?\s*\*{0,2}(\d{1,2})\s*\/\s*10/gi;
// The model sometimes writes the total before the name ("= 8/10 PAS") —
// accept that order too rather than burdening the format contract further.
export const SCORE_LINE_REV_RE =
  /\*{0,2}(\d{1,2})\s*\/\s*10\s*\*{0,2}[^\n]*?\b(PAS|Alvarado)\b/gi;

export function parseConsultProse(text: string): ProseSection[] {
  const sections: ProseSection[] = [{ blocks: [], scores: [] }];
  const cur = () => sections[sections.length - 1];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const mv = MOVE_LINE_RE.exec(line);
    if (mv) {
      let rest = mv[2].trim();
      let title = rest;
      let content = "";
      // Split "Title: content" / "Title — content" (first separator within
      // a title-plausible distance).
      const cands = [rest.indexOf(":"), rest.indexOf("—")].filter(
        (x) => x > -1 && x < 60,
      );
      if (cands.length) {
        const idx = Math.min(...cands);
        title = rest.slice(0, idx);
        content = rest.slice(idx + 1).trim();
      }
      title = title.replace(/\*\*/g, "").replace(/[:—–]\s*$/, "").trim();
      sections.push({ num: mv[1], title, blocks: [], scores: [] });
      const cleaned = content.replace(/^\*+\s*/, "").trim();
      if (cleaned) cur().blocks.push({ kind: "para", text: cleaned });
    } else {
      const bullet = /^[-•]\s+(.*)$/.exec(line);
      const step = /^(\d{1,2})[.)]\s+(.*)$/.exec(line);
      if (bullet) cur().blocks.push({ kind: "bullet", text: bullet[1] });
      else if (step)
        cur().blocks.push({
          kind: "step",
          n: parseInt(step[1], 10),
          text: step[2],
        });
      else cur().blocks.push({ kind: "para", text: line });
    }

    // Score totals stated on this line feed the section's meter — EVERY
    // statement, so two scores sharing a line each reach their own meter,
    // and the last statement of a given score wins. The update is IN PLACE
    // (never filter+push): a restated score must not reorder the meters
    // mid-stream — reordering would swap rows visibly and restart the
    // sibling meter's settled animation. Name-first order preferred;
    // total-first ("= 8/10 PAS") accepted as fallback.
    const apply = (rawName: string, rawValue: string) => {
      const name = rawName.toUpperCase() === "PAS" ? "PAS" : "Alvarado";
      const value = parseInt(rawValue, 10);
      if (value <= 10) {
        const existing = cur().scores.find((s) => s.name === name);
        if (existing) existing.value = value;
        else cur().scores.push({ name, value });
      }
    };
    let matched = false;
    SCORE_LINE_RE.lastIndex = 0;
    for (let m = SCORE_LINE_RE.exec(line); m; m = SCORE_LINE_RE.exec(line)) {
      matched = true;
      apply(m[1], m[2]);
    }
    if (!matched) {
      SCORE_LINE_REV_RE.lastIndex = 0;
      for (
        let m = SCORE_LINE_REV_RE.exec(line);
        m;
        m = SCORE_LINE_REV_RE.exec(line)
      ) {
        apply(m[2], m[1]);
      }
    }
  }
  return sections.filter((s) => s.num || s.blocks.length > 0);
}

// Flat "score name → last stated total" view of one companion message — the
// transcript-derived input for the meters' delta encoding (PAS ▲ +2).
export function scoresInText(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const sec of parseConsultProse(text))
    for (const s of sec.scores) out[s.name] = s.value;
  return out;
}
