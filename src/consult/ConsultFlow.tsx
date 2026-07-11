import { useEffect, useRef, useState } from "react";
// Value import across the worker boundary — deliberate and leak-audited: the
// scorer holds only chip labels, component names, and band strings (all
// already public UI text). It must NEVER grow an import of the reference or
// prompts; the build leak-grep pins this.
import { computeAlvarado, computePas } from "../../functions/lib/consultScore";

// ═══════════════════════ SECTION 2 — THE CONSULT COMPANION ══════════════════
// The second door on the same night: a health worker with a REAL child in
// front of them. Everything below is additive and self-contained — it never
// touches caseData/sim/localStorage, so the proven simulator cannot be
// destabilized from here. Delete this block and the hero is unchanged.
//
// PHI is ephemeral BY CONSTRUCTION: the patient intake and the conversation
// live only in this component's React state; leaving the flow (or a refresh)
// erases them. Nothing consult-related is ever persisted anywhere.

interface ConsultMessage {
  role: "clinician" | "companion";
  text: string;
  // Post-stream dose-regex backstop tripped on this reply (a FLAG shown to
  // the clinician, never a guarantee — the prompt rails are primary).
  doseFlag?: boolean;
}

// PAS-mapped history items (plan §4): the picture arrives score-ready without
// the clinician needing to know a score exists.
const COMPLAINT_CHIPS = [
  "Abdominal pain",
  "Pain migrated to RLQ",
  "Anorexia / won't eat",
  "Nausea / vomiting",
  "Fever ≥ 38 °C",
  "Pain worse with cough or movement",
];

const EXAM_CHIPS = [
  "RLQ tenderness",
  "Rebound tenderness",
  "Percussion tenderness",
  "Pain on hopping / cough",
  "Voluntary guarding",
  "Involuntary guarding / rigidity",
  "Abdomen soft / benign",
  "Distension",
  "Reduced or absent bowel sounds",
  "Toxic appearance",
];

// Pre-checked to the typical rural district hospital (confirm-don't-compose):
// the clinician touches only the exceptions.
const RESOURCE_ITEMS: { label: string; rural: boolean }[] = [
  { label: "CT scanner", rural: false },
  { label: "Ultrasound", rural: false },
  { label: "Plain X-ray", rural: true },
  { label: "Labs / CBC", rural: true },
  { label: "Urine dip", rural: true },
  { label: "Analgesia (IV)", rural: true },
  { label: "Surgeon on site", rural: false },
  { label: "PICU", rural: false },
  { label: "Blood bank", rural: false },
  { label: "IV fluids / antibiotics", rural: true },
];

// Labs-strip parser: tolerant of Turkish comma decimals ("15,2"), empty → null,
// out-of-range → null (a typo is not a patient; the worker re-validates).
function parseLabNum(raw: string, min: number, max: number): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

const TRANSFER_CHOICES: { key: string; label: string; min: number | null }[] = [
  { key: "45", label: "< 1 h", min: 45 },
  { key: "90", label: "1–2 h", min: 90 },
  { key: "180", label: "2–4 h", min: 180 },
  { key: "240", label: "~4 h", min: 240 },
  { key: "360", label: "> 4 h", min: 360 },
  { key: "unknown", label: "Unknown", min: null },
];

// The locked role model: 5 clinical roles enter the companion (role tunes
// tone/depth ONLY — the safety content is identical); the student gets two
// doors; the family gets a safe guide, never the companion.
const CLINICAL_ROLES: { role: string; sub?: string }[] = [
  { role: "Doctor / GP", sub: "The clinician with no surgeon down the hall" },
  { role: "Resident / Intern" },
  { role: "Nurse" },
  { role: "Midwife", sub: "Often the only health worker in the village post" },
  { role: "Community health worker" },
];

// Conservative dose backstop (plan §3): number + dose unit. /µL and % are
// deliberately NOT matched so lab values never trip it.
const DOSE_RE = /\b\d[\d.,]*\s*(mg\/kg|m[lL]\/kg|mg|mcg|µg|IU|units?|mmol|mEq)\b/;

function toggleIn(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function ConsultFlow({
  onExit,
  onStartSim,
}: {
  onExit: () => void;
  onStartSim: () => void;
}) {
  const [stage, setStage] = useState<
    "identity" | "student" | "family" | "intake" | "chat"
  >("identity");
  // Greeting only — deliberately NEVER sent to the server (zero value to the
  // model, one less injection surface, one less identity on the wire).
  const [clinName, setClinName] = useState("");
  const [role, setRole] = useState("");
  const [ptName, setPtName] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [complaints, setComplaints] = useState<string[]>(["Abdominal pain"]);
  const [complaintNote, setComplaintNote] = useState("");
  const [examFindings, setExamFindings] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>(
    RESOURCE_ITEMS.filter((r) => r.rural).map((r) => r.label),
  );
  const [transferKey, setTransferKey] = useState("240");
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [input, setInput] = useState("");
  const [cPhase, setCPhase] = useState<"idle" | "streaming" | "ready">("idle");
  const [cError, setCError] = useState<string | null>(null);
  // The GROUNDED pill's provenance card (source / validation / boundary +
  // the domain-library shelf). Render-only; dies with the flow like all else.
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  // Labs strip (chat stage) — structured so the WORKER's deterministic
  // PAS/Alvarado can own the arithmetic; ephemeral like the rest of the intake.
  const [labWbc, setLabWbc] = useState("");
  const [labNeut, setLabNeut] = useState("");
  const [labTemp, setLabTemp] = useState("");
  const consultAbortRef = useRef<AbortController | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  // Scoring-relevant intake as last sent (chips + exam + labs, JSON) — lets
  // sendConsult stamp a deterministic "intake changed" cue on the next message.
  const lastScoringSliceRef = useRef<string | null>(null);

  // Leaving the flow aborts any in-flight stream; unmount wipes the state —
  // which IS the PHI guarantee.
  useEffect(() => () => consultAbortRef.current?.abort(), []);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const age = parseInt(ageYears, 10);
  const ageValid = Number.isInteger(age) && age >= 0 && age <= 18;
  const canStart =
    ptName.trim().length > 0 && ageValid && sex !== "" && complaints.length > 0;

  function buildIntake() {
    const complaint = [...complaints, complaintNote.trim()]
      .filter(Boolean)
      .join("; ")
      .slice(0, 200);
    const transfer = TRANSFER_CHOICES.find((t) => t.key === transferKey);
    return {
      name: ptName.trim().slice(0, 40),
      ageYears: age,
      sex,
      complaint,
      // Exact chip labels, separately from the composed string — the worker's
      // code-owned PAS/Alvarado scores from these, never from free text.
      complaintChips: complaints.slice(0, 12),
      examFindings: examFindings.slice(0, 24),
      resources: resources.slice(0, 16),
      transferTimeMin: transfer ? transfer.min : null,
      // Labs strip (chat stage); rides with EVERY turn since the worker is
      // stateless — entering labs updates the code-computed scores next send.
      labs: {
        wbcK: parseLabNum(labWbc, 0, 200),
        neutPct: parseLabNum(labNeut, 0, 100),
        tempC: parseLabNum(labTemp, 30, 45),
      },
      clinicianRole: role.slice(0, 40),
      // Sent for address only ("Dr. Şahin") — ephemeral like the rest of the
      // intake, never persisted anywhere.
      clinicianName: clinName.trim().slice(0, 40),
    };
  }

  // A local COPY of the hero's reader loop on purpose — sharing it would mean
  // editing the hero (plan §4: no hero edits beyond the gate + the door).
  async function streamConsult(res: Response) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const append = (delta: string) => {
      if (!delta) return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        // A chunk landing after a reset cleared the chat must not
        // materialize a ghost message (same guard as the hero's reader).
        if (!last) return prev;
        const next = [...prev];
        next[next.length - 1] = { ...last, text: last.text + delta };
        return next;
      });
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      append(decoder.decode(value, { stream: true }));
    }
    // Flush the decoder's tail: a multi-byte character split across the
    // final chunk boundary would otherwise drop the last glyph.
    append(decoder.decode());
    // The server streams straight through (no buffering), so the dose check
    // can only run on the COMPLETED text — an honest post-hoc flag.
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "companion" && DOSE_RE.test(last.text))
        next[next.length - 1] = { ...last, doseFlag: true };
      return next;
    });
  }

  function historyPayload(msgs: ConsultMessage[]) {
    const entries = msgs
      .filter((m) => m.text.trim().length > 0)
      .map((m) => ({
        role: m.role === "companion" ? ("assistant" as const) : ("user" as const),
        content: m.text.slice(0, 6000),
      }));
    // Keep the opening assessment (it anchors the consult) + the most recent
    // turns, inside the server's 40-entry cap.
    return entries.length > 39 ? [entries[0], ...entries.slice(-38)] : entries;
  }

  // The auto-fired first pass (the hero's "present" beat): entering the chat
  // never waits for the clinician to compose a question.
  async function startConsult() {
    if (!canStart || cPhase === "streaming") return;
    setCError(null);
    setStage("chat");
    setCPhase("streaming");
    setMessages([{ role: "companion", text: "" }]);
    const controller = new AbortController();
    consultAbortRef.current = controller;
    const intake = buildIntake();
    // Seed the change-tracker with the opening intake so the first reply only
    // carries the "intake changed" cue if something actually changed.
    lastScoringSliceRef.current = JSON.stringify({
      c: intake.complaintChips,
      e: intake.examFindings,
      l: intake.labs,
    });
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intent: "open",
          intake,
          history: [],
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setCError(`The companion could not open the consult (${res.status}).`);
        setMessages([]);
        setStage("intake");
        setCPhase("idle");
        return;
      }
      await streamConsult(res);
      setCPhase("ready");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setCError((err as Error).message);
        setMessages([]);
        setStage("intake");
        setCPhase("idle");
      }
    } finally {
      consultAbortRef.current = null;
    }
  }

  async function sendConsult() {
    const text = input.trim();
    if (!text || cPhase !== "ready") return;
    setCError(null);
    setInput("");
    const history = historyPayload(messages);
    setCPhase("streaming");
    setMessages((prev) => [
      ...prev,
      { role: "clinician", text },
      { role: "companion", text: "" },
    ]);
    const controller = new AbortController();
    consultAbortRef.current = controller;
    // Code-owned cue against transcript anchoring: when the scoring-relevant
    // intake changed since the LAST send (labs entered, chips re-ticked), the
    // CLIENT says so — deterministically, in the API message only (the chat
    // bubble shows exactly what was typed). Without this, a neutral message
    // lets the model echo its own stale score lines from the transcript
    // instead of the updated CODE-COMPUTED block (caught live, 11 Tem).
    const intake = buildIntake();
    const scoringSlice = JSON.stringify({
      c: intake.complaintChips,
      e: intake.examFindings,
      l: intake.labs,
    });
    const intakeChanged =
      lastScoringSliceRef.current !== null &&
      lastScoringSliceRef.current !== scoringSlice;
    lastScoringSliceRef.current = scoringSlice;
    const apiMessage = intakeChanged
      ? `${text}\n\n[App note: the structured intake changed since the previous message — labs/chips updated.]`
      : text;
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intent: "reply",
          intake,
          message: apiMessage,
          history,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setCError(`The companion failed (${res.status}).`);
        setMessages((prev) => prev.slice(0, -2));
        setInput(text);
        setCPhase("ready");
        return;
      }
      await streamConsult(res);
      setCPhase("ready");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setCError((err as Error).message);
        setMessages((prev) => prev.slice(0, -2));
        setInput(text);
        setCPhase("ready");
      }
    } finally {
      consultAbortRef.current = null;
    }
  }

  const transferLabel =
    TRANSFER_CHOICES.find((t) => t.key === transferKey)?.label ?? "";
  const noCT = !resources.includes("CT scanner");
  const noUS = !resources.includes("Ultrasound");
  const noSurgeon = !resources.includes("Surgeon on site");

  // LIVE code-computed scores — the instrument reacts the moment a chip or a
  // lab value changes, no model round-trip. Same deterministic functions the
  // worker uses (single source); the model's reply only ever EXPLAINS these.
  const liveIntake = {
    name: "",
    ageYears: ageValid ? age : 0,
    sex: sex === "" ? ("male" as const) : sex,
    complaint: "",
    complaintChips: complaints,
    examFindings,
    resources,
    transferTimeMin: null,
    labs: {
      wbcK: parseLabNum(labWbc, 0, 200),
      neutPct: parseLabNum(labNeut, 0, 100),
      tempC: parseLabNum(labTemp, 30, 45),
    },
    clinicianRole: "",
    clinicianName: "",
  };
  const livePas = computePas(liveIntake);
  const liveAlv = computeAlvarado(liveIntake);
  // LOW IS NEVER GREEN: neutral below, amber equivocal, red alarm high.
  const liveTone = (total: number, hi: number, mid: number) =>
    total >= hi
      ? "text-red-300"
      : total >= mid
        ? "text-amber-300/90"
        : "text-neutral-300";

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-xl flex-col px-5 py-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-neutral-100">
            SALUS Zero
          </span>
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">
            Consult
          </span>
        </div>
        <button
          onClick={onExit}
          className="text-[11px] text-neutral-500 transition hover:text-neutral-300"
        >
          {stage === "chat"
            ? "End the consult — erases the patient from this device"
            : "← Back to the night"}
        </button>
      </div>

      {stage === "identity" && (
        <section className="flex flex-col gap-5 motion-safe:animate-reveal-in">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Before we begin
            </p>
            <h1 className="mt-2 font-vignette text-2xl text-neutral-100">
              Who's at the bedside?
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Your role only changes how much I explain — never the clinical
              safety content. It mainly tells the tool whether it can help you
              at all.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              Your name (optional — used only to address you, never stored)
            </span>
            <input
              value={clinName}
              onChange={(e) => setClinName(e.target.value)}
              maxLength={40}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-[15px] focus:border-neutral-500 focus:outline-none"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              Role — health worker at the bedside
            </span>
            {CLINICAL_ROLES.map((r) => (
              <button
                key={r.role}
                onClick={() => {
                  setRole(r.role);
                  setStage("intake");
                }}
                className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 px-5 py-3.5 text-left transition hover:border-ember-500/50 hover:bg-neutral-900/80"
              >
                <span className="text-[15px] text-neutral-200">{r.role}</span>
                {r.sub && (
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {r.sub}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-neutral-800" />
            <span className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              Not managing a patient?
            </span>
            <span className="h-px flex-1 bg-neutral-800" />
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setStage("student")}
              className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 px-5 py-3.5 text-left transition hover:border-neutral-600 hover:bg-neutral-900/60"
            >
              <span className="text-[15px] text-neutral-300">
                Medical student
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                Learn by playing a case — or prepare for your posting
              </span>
            </button>
            <button
              onClick={() => setStage("family")}
              className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 px-5 py-3.5 text-left transition hover:border-amber-600/60 hover:bg-neutral-900/50"
            >
              <span className="text-[15px] text-neutral-300">
                I'm here about my own child
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                A calm, safe guide — no diagnosis
              </span>
            </button>
          </div>
        </section>
      )}

      {stage === "student" && (
        <section className="flex flex-col gap-5 motion-safe:animate-reveal-in">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              You're a medical student
            </p>
            <h1 className="mt-2 font-vignette text-2xl text-neutral-100">
              Two ways to learn — both are for you.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              You'll likely be posted somewhere just like this. Learn the
              judgement now — and learn the tool you'll lean on when you get
              there.
            </p>
          </div>
          <button
            onClick={onStartSim}
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3.5 text-left transition hover:border-neutral-600"
          >
            <span className="text-[15px] text-neutral-200">
              Play a case in the simulator
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">
              Learn by doing — a hidden case, free-text decisions, an
              attending's debrief
            </span>
          </button>
          <button
            onClick={() => {
              setRole("Student");
              setStage("intake");
            }}
            className="rounded-xl border border-ember-500/50 bg-neutral-900/60 px-4 py-3.5 text-left transition hover:border-ember-400"
          >
            <span className="text-[15px] text-neutral-100">
              Explore the companion
            </span>
            <span className="mt-0.5 block text-xs text-ember-300/80">
              See how it reasons — prepare for your posting
            </span>
          </button>
          <p className="text-xs leading-relaxed text-neutral-500">
            In learning mode the companion explains more — and it stays honest:
            the responsible clinician always owns the decision.
          </p>
          <button
            onClick={() => setStage("identity")}
            className="self-start text-xs text-neutral-500 transition hover:text-neutral-300"
          >
            ← Back
          </button>
        </section>
      )}

      {stage === "family" && (
        <section className="flex flex-col gap-5 motion-safe:animate-reveal-in">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400/90">
              A guide for parents &amp; caregivers
            </p>
            <h1 className="mt-2 font-vignette text-2xl text-neutral-100">
              You did the right thing checking. Here's the safe, honest guide.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              This isn't a diagnosis or a score — your child needs a person who
              can examine them. Here's how to get there well.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
              <span className="text-lg" aria-hidden>
                1
              </span>
              <p className="text-sm leading-relaxed text-neutral-300">
                <span className="font-semibold text-neutral-100">
                  Take your child to the nearest hospital or clinic.
                </span>{" "}
                Belly pain in a child that worries you is always worth a real
                examination — going in is never the wrong call.
              </p>
            </div>
            <div className="flex gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
              <span className="text-lg" aria-hidden>
                2
              </span>
              <p className="text-sm leading-relaxed text-neutral-300">
                <span className="font-semibold text-neutral-100">
                  Bring what you've noticed:
                </span>{" "}
                when the pain started, whether it moved, vomiting, fever, and
                when they last ate, drank, and passed urine.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400/90">
              Go now — don't wait — if you see
            </p>
            <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-neutral-300">
              <li>· A hard belly, or pain that makes them refuse to be touched</li>
              <li>· Drowsy, floppy, or hard to wake</li>
              <li>· Vomiting that won't stop, or green vomit</li>
              <li>· No urine for many hours, or looking very dry</li>
              <li>
                · Pain that suddenly eased but the child looks{" "}
                <em className="text-amber-300/90">worse</em> — that can be
                dangerous, not better
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-red-900/70 bg-red-950/30 p-4 text-sm leading-relaxed text-red-200">
            <span className="font-semibold">
              Call your local emergency number now
            </span>{" "}
            (in Türkiye: 112) if your child is very hard to wake, breathing
            fast, cold or mottled — or you're frightened by how they look.
            Trust that feeling.
          </div>

          <p className="text-xs leading-relaxed text-neutral-600">
            I can't point you to a specific nearest facility — that needs real
            local data this tool doesn't have, and a wrong direction is
            dangerous. Your fastest known hospital or emergency line is the
            right choice.
          </p>
          <button
            onClick={() => setStage("identity")}
            className="self-start text-xs text-neutral-500 transition hover:text-neutral-300"
          >
            ← Back
          </button>
        </section>
      )}

      {stage === "intake" && (
        <section className="flex flex-col gap-5 pb-24 motion-safe:animate-reveal-in">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Confirm — don't compose
              {clinName.trim() ? ` · ${clinName.trim()}` : ""}
            </p>
            <h1 className="mt-2 font-vignette text-2xl text-neutral-100">
              The patient in front of you
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Pre-filled for a typical rural district hospital — touch only
              what's different. Under a minute.
            </p>
          </div>

          {cError && (
            <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {cError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500">
                Name <span className="text-ember-400">*</span>
              </span>
              <input
                value={ptName}
                onChange={(e) => setPtName(e.target.value)}
                maxLength={40}
                className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-[15px] focus:border-neutral-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500">
                Age (years) <span className="text-ember-400">*</span>
              </span>
              <input
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                inputMode="numeric"
                maxLength={2}
                className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-[15px] tabular-nums focus:border-neutral-500 focus:outline-none"
              />
            </label>
          </div>
          {ageYears !== "" && !ageValid && (
            <p className="-mt-3 text-xs text-amber-300/90">
              Age must be 0–18 — this tool is grounded for children only.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              Sex <span className="text-ember-400">*</span>{" "}
              <span className="normal-case tracking-normal text-neutral-500">
                (drives which can't-miss diagnoses come forward)
              </span>
            </span>
            <div className="flex gap-2">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  aria-pressed={sex === s}
                  className={`rounded-lg border px-4 py-2 text-sm transition ${
                    sex === s
                      ? "border-ember-500/60 bg-ember-500/15 text-neutral-100"
                      : "border-neutral-700 bg-neutral-900/40 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  {s === "male" ? "Boy" : "Girl"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              Complaint &amp; history
            </span>
            <div className="flex flex-wrap gap-2">
              {COMPLAINT_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setComplaints((prev) => toggleIn(prev, c))}
                  aria-pressed={complaints.includes(c)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] transition ${
                    complaints.includes(c)
                      ? "border-ember-500/60 bg-ember-500/15 text-neutral-100"
                      : "border-neutral-700 bg-neutral-900/40 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  {complaints.includes(c) ? "✓ " : ""}
                  {c}
                </button>
              ))}
            </div>
            <input
              value={complaintNote}
              onChange={(e) => setComplaintNote(e.target.value)}
              maxLength={80}
              placeholder="Anything else, in a few words… (optional)"
              className="mt-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              Exam findings{" "}
              <span className="normal-case tracking-normal text-neutral-500">
                (no imaging needed)
              </span>
            </span>
            <div className="flex flex-wrap gap-2">
              {EXAM_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setExamFindings((prev) => toggleIn(prev, c))}
                  aria-pressed={examFindings.includes(c)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] transition ${
                    examFindings.includes(c)
                      ? "border-ember-500/60 bg-ember-500/15 text-neutral-100"
                      : "border-neutral-700 bg-neutral-900/40 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  {examFindings.includes(c) ? "✓ " : ""}
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              What this hospital actually has tonight
            </span>
            <div className="grid grid-cols-2 gap-2">
              {RESOURCE_ITEMS.map((r) => {
                const on = resources.includes(r.label);
                return (
                  <button
                    key={r.label}
                    onClick={() =>
                      setResources((prev) => toggleIn(prev, r.label))
                    }
                    aria-pressed={on}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition ${
                      on
                        ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                        : "border-neutral-800 bg-neutral-900/30 text-neutral-500 hover:border-neutral-600"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-4 w-4 flex-none place-items-center rounded border text-[10px] ${
                        on
                          ? "border-sky-400 bg-sky-400 text-neutral-950"
                          : "border-neutral-700 text-neutral-700"
                      }`}
                    >
                      {on ? "✓" : "—"}
                    </span>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              Time to definitive care (referral)
            </span>
            <div className="flex flex-wrap gap-2">
              {TRANSFER_CHOICES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTransferKey(t.key)}
                  aria-pressed={transferKey === t.key}
                  className={`rounded-lg border px-3.5 py-1.5 text-[13px] tabular-nums transition ${
                    transferKey === t.key
                      ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                      : "border-neutral-700 bg-neutral-900/40 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sticky bottom-4 mt-2 flex gap-2">
            <button
              onClick={() => setStage("identity")}
              className="rounded-lg border border-neutral-700 bg-neutral-950/90 px-4 py-2.5 text-sm text-neutral-400 backdrop-blur transition hover:text-neutral-200"
            >
              ← Back
            </button>
            <button
              onClick={() => void startConsult()}
              disabled={!canStart}
              className="flex-1 rounded-lg bg-ember-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-ember-500/20 transition hover:bg-ember-300 disabled:opacity-40"
            >
              Bring {ptName.trim() || "the patient"} in →
            </button>
          </div>
        </section>
      )}

      {stage === "chat" && (
        <section className="flex min-h-0 flex-1 flex-col gap-3 motion-safe:animate-reveal-in">
          <div className="sticky top-3 z-10 flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2.5 backdrop-blur">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-neutral-100">
                {ptName.trim() || "Patient"} · {ageYears}
              </div>
              <div className="truncate text-[11px] tabular-nums text-neutral-500">
                {[
                  sex === "male" ? "boy" : "girl",
                  noCT ? "no CT" : null,
                  noUS ? "no US" : null,
                  noSurgeon ? "no surgeon" : null,
                  `${transferLabel} transfer`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            {/* The GROUNDED pill is the provenance door: source, validation,
                boundary — and the library shelf. The dashed shelf row below is
                a POSITION, never an affordance: no "+", no add-verb, no
                interactivity — a clickable add would read as a working
                feature, which it is not yet. */}
            <button
              type="button"
              onClick={() => setProvenanceOpen((o) => !o)}
              aria-expanded={provenanceOpen}
              aria-controls="provenance-card"
              title="Why it can say that — source, validation, boundary"
              className="ml-auto flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-sky-300/90 transition hover:border-sky-400/50 hover:bg-sky-500/15"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-sky-400 motion-safe:animate-pulse"
              />
              grounded
              <span
                aria-hidden
                className={`text-sky-400/70 transition-transform${provenanceOpen ? " rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
          </div>

          {/* Labs strip — structured entry so the SCORE ARITHMETIC stays in
              code: values ride with the next message; the worker recomputes
              PAS/Alvarado deterministically and the model may only present
              them. Cold instrument register, like the score meters. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">
              Labs · scores compute in code
            </span>
            {(
              [
                ["WBC ×1000/µL", labWbc, setLabWbc, "15.2", 0, 200],
                ["Neut %", labNeut, setLabNeut, "78", 0, 100],
                ["Temp °C", labTemp, setLabTemp, "38.2", 30, 45],
              ] as const
            ).map(([label, value, set, ph, min, max]) => {
              // Display and payload must never diverge: a value parseLabNum
              // would drop (typo / wrong unit like an absolute "15200") is
              // marked invalid HERE, not silently nulled on send.
              const invalid =
                value.trim() !== "" && parseLabNum(value, min, max) === null;
              return (
                <label
                  key={label}
                  className="flex items-center gap-1.5 text-[11px] text-neutral-400"
                >
                  {label}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={ph}
                    aria-invalid={invalid}
                    title={
                      invalid
                        ? `Out of range (${min}–${max}) — not sent. Check the unit: ${label}.`
                        : undefined
                    }
                    className={`w-16 rounded-md border bg-neutral-950/60 px-2 py-1 font-mono text-xs tabular-nums text-neutral-200 placeholder:text-neutral-700 focus:outline-none ${
                      invalid
                        ? "border-red-500/70 text-red-300 focus:border-red-400"
                        : "border-neutral-700 focus:border-neutral-500"
                    }`}
                  />
                  {invalid && (
                    <span className="text-[10px] text-red-400">
                      not sent — check unit
                    </span>
                  )}
                </label>
              );
            })}
            <span className="text-[10px] text-neutral-500">
              sent with your next message
            </span>
            {/* Live readout: computed IN CODE from the ticked chips + labs,
                updates on every keystroke — the model never touches these
                numbers, it only explains them in its replies. */}
            <span className="ml-auto flex items-center gap-2 font-mono text-[11px] tabular-nums">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                live · code
              </span>
              <span
                className={
                  livePas.computable ? liveTone(livePas.total, 7, 3) : "text-neutral-500"
                }
              >
                PAS {livePas.computable ? `${livePas.total}/10` : "—"}
              </span>
              <span
                className={
                  liveAlv.computable ? liveTone(liveAlv.total, 7, 4) : "text-neutral-500"
                }
              >
                Alvarado {liveAlv.computable ? `${liveAlv.total}/10` : "—"}
              </span>
            </span>
          </div>

          {provenanceOpen && (
            <div
              id="provenance-card"
              className="rounded-xl border border-sky-500/25 bg-neutral-900/70 px-4 py-3 backdrop-blur motion-safe:animate-reveal-in"
            >
              <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                Grounding
              </div>
              <div className="mt-1 text-sm font-semibold text-neutral-100">
                Pediatric Appendicitis — Reference v1
              </div>
              <div className="mt-2 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-xs leading-relaxed">
                <span className="pt-px text-[10px] uppercase tracking-wider text-neutral-500">
                  Source
                </span>
                <span className="text-neutral-300">
                  Holcomb &amp; Ashcraft's Pediatric Surgery, 8th ed. — Ch. 40,
                  Appendicitis in Children
                </span>
                <span className="pt-px text-[10px] uppercase tracking-wider text-neutral-500">
                  Validated
                </span>
                <span className="text-neutral-300">
                  Şahin Parlak, MD (pediatric surgery) — read and approved
                  line by line
                </span>
                <span className="pt-px text-[10px] uppercase tracking-wider text-neutral-500">
                  Boundary
                </span>
                <span className="text-neutral-300">
                  Answers from this document only. Where it is silent, it says
                  so.
                </span>
              </div>
              <div className="my-3 border-t border-neutral-800" />
              <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                The library
              </div>
              <p className="mt-1.5 font-vignette text-[15px] italic leading-snug text-ember-300/90">
                The engine takes domain references as data; appendicitis is the
                first validated domain.
              </p>
              <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[13px] text-sky-200">
                <span className="text-[10px] tabular-nums text-sky-300/70">
                  01 ·
                </span>
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-sky-400"
                />
                Pediatric appendicitis
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-sky-300/80">
                  validated · v1
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-dashed border-neutral-700 px-3 py-2 text-[13px] text-neutral-500">
                <span className="text-[10px] tabular-nums text-neutral-500">
                  02 ·
                </span>
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full border border-neutral-600"
                />
                Next domain
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                  coming · expert-authored
                </span>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-neutral-400">
                A new domain earns this light the way appendicitis did: an
                expert authors its reference, it is validated line by line,
                red-teamed for its own failure modes, and versioned like a
                study.{" "}
                <span className="text-neutral-200">
                  Never a free-text upload
                </span>{" "}
                — grounding anyone can paste in isn't grounding.
              </p>
            </div>
          )}

          {role === "Student" && (
            <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-200">
              Learning mode — the companion explains more here. The responsible
              clinician always owns the decision.
            </p>
          )}

          <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-3.5 py-2 text-xs leading-relaxed text-amber-200/90">
            <span className="font-semibold">
              Prototype — not a validated medical device.
            </span>{" "}
            It augments your judgement, never replaces it. No doses, no
            directives — verify, you decide.
          </div>

          {/* The pinned anamnesis: exactly what was entered, always in view
              (collapsible). This is now the wrong-entry catch — the companion
              is told NOT to re-narrate the intake, so replies stay short.
              Complaint/exam chips stay TICKABLE mid-consult (serial-exam
              doctrine: rebound develops, anorexia gets confirmed) — the intake
              rides with every message, so the code-computed scores update on
              the next send. */}
          <details
            open
            className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 px-3.5 py-2 text-xs leading-relaxed"
          >
            <summary className="cursor-pointer select-none text-[11px] uppercase tracking-wider text-neutral-500">
              Anamnesis — what you entered · chips re-tickable
            </summary>
            <div className="mt-2 flex flex-col gap-1 text-neutral-300">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-neutral-500">Complaint: </span>
                {COMPLAINT_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setComplaints((prev) => toggleIn(prev, c))
                    }
                    aria-pressed={complaints.includes(c)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                      complaints.includes(c)
                        ? "border-neutral-500 bg-neutral-700/60 text-neutral-100"
                        : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                {complaintNote.trim() && (
                  <span className="text-neutral-400">
                    · {complaintNote.trim()}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-neutral-500">Exam: </span>
                {EXAM_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setExamFindings((prev) => toggleIn(prev, c))
                    }
                    aria-pressed={examFindings.includes(c)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                      examFindings.includes(c)
                        ? "border-neutral-500 bg-neutral-700/60 text-neutral-100"
                        : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div>
                <span className="text-neutral-500">Has tonight: </span>
                {resources.length ? resources.join(", ") : "none"}
              </div>
              <div>
                <span className="text-neutral-500">Not available: </span>
                {RESOURCE_ITEMS.filter((r) => !resources.includes(r.label))
                  .map((r) => r.label)
                  .join(", ") || "—"}
              </div>
              <div>
                <span className="text-neutral-500">Transfer: </span>
                {transferLabel}
              </div>
              {(labWbc.trim() || labNeut.trim() || labTemp.trim()) && (
                <div>
                  <span className="text-neutral-500">Labs entered: </span>
                  {/* Rendered from the PARSED values — what the record claims
                      is exactly what the worker scores from. */}
                  {[
                    labWbc.trim() &&
                      (parseLabNum(labWbc, 0, 200) !== null
                        ? `WBC ${parseLabNum(labWbc, 0, 200)}k`
                        : "WBC invalid (not sent)"),
                    labNeut.trim() &&
                      (parseLabNum(labNeut, 0, 100) !== null
                        ? `neut ${parseLabNum(labNeut, 0, 100)}%`
                        : "neut invalid (not sent)"),
                    labTemp.trim() &&
                      (parseLabNum(labTemp, 30, 45) !== null
                        ? `${parseLabNum(labTemp, 30, 45)} °C`
                        : "temp invalid (not sent)"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
            </div>
          </details>

          <div
            ref={chatRef}
            role="log"
            aria-live="polite"
            aria-label="Consult conversation"
            tabIndex={0}
            className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto py-3 pr-1"
          >
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "clinician" ? (
                  <div className="ml-10 rounded-2xl bg-neutral-800/40 px-4 py-3">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                      You
                    </div>
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-200">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div>
                    {m.text === "" && cPhase === "streaming" ? (
                      <p className="font-vignette text-[15px] italic text-neutral-500">
                        Reading {ptName.trim() || "the patient"}'s intake
                        against the reference…
                      </p>
                    ) : (
                      <div>
                        <ConsultProse text={m.text} transfer={transferLabel} />
                        {cPhase === "streaming" && i === messages.length - 1 && (
                          <span
                            aria-hidden
                            className="text-neutral-500 motion-safe:animate-pulse"
                          >
                            ▍
                          </span>
                        )}
                      </div>
                    )}
                    {m.doseFlag && (
                      <p role="alert" className="mt-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs leading-relaxed text-red-300">
                        ⚠ This reply appears to contain a dose or directive —
                        the tool must not do that. Treat it as an error and
                        verify independently.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {cError && (
            <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {cError}
            </p>
          )}

          {/* The consult bench: one floating pill, ember-armed send — the
              modern-airiness pass. Same handlers, same disabled logic. */}
          <div className="pb-3">
            <div className="flex items-end gap-1.5 rounded-3xl border border-neutral-700/50 bg-neutral-900/80 py-2 pl-4 pr-2 shadow-lg shadow-black/40 backdrop-blur transition focus-within:border-neutral-500/70">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // An Enter that confirms an IME composition must not send.
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (cPhase === "ready" && input.trim()) void sendConsult();
                  }
                }}
                rows={2}
                disabled={cPhase !== "ready"}
                placeholder={`Ask a follow-up about ${ptName.trim() || "the patient"}…`}
                className="flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed placeholder:text-neutral-600 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={() => void sendConsult()}
                disabled={cPhase !== "ready" || !input.trim()}
                aria-label="Send"
                title="Send (Enter)"
                className="grid h-9 w-9 flex-none place-items-center self-end rounded-full bg-ember-400 text-neutral-950 transition hover:bg-ember-300 disabled:opacity-40"
              >
                <span aria-hidden className="text-lg leading-none">
                  ↑
                </span>
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

// ── ConsultProse: the companion's streamed plain text, rendered as a clinical
// layout. The model keeps streaming prose (nothing structured on the wire);
// the CLIENT parses the format contract — "(iii) Title:" move lines, "- "
// bullets, "1." steps, "= N/10" score lines, **bold** — and draws the face:
// section headers, score meters, a tick-off worklist. Same philosophy as the
// hero: the model narrates, the instruments are drawn by code. Parsing runs
// on the full accumulated text every render, so it is streaming-safe.

interface ProseBlock {
  kind: "para" | "bullet" | "step";
  text: string;
  n?: number;
}
interface ProseSection {
  num?: string;
  title?: string;
  blocks: ProseBlock[];
  scores: { name: string; value: number }[];
}

const MOVE_LINE_RE = /^\*{0,2}\((i{1,3}|iv|vi?)\)\*{0,2}\s*(.*)$/;
const SCORE_LINE_RE = /\b(PAS|Alvarado)\b[^\n]*?=?\s*\*{0,2}(\d{1,2})\s*\/\s*10/i;
// The model sometimes writes the total before the name ("= 8/10 PAS") —
// accept that order too rather than burdening the format contract further.
const SCORE_LINE_REV_RE =
  /\*{0,2}(\d{1,2})\s*\/\s*10\s*\*{0,2}[^\n]*?\b(PAS|Alvarado)\b/i;

function parseConsultProse(text: string): ProseSection[] {
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
        cur().blocks.push({ kind: "step", n: parseInt(step[1], 10), text: step[2] });
      else cur().blocks.push({ kind: "para", text: line });
    }

    // A score total stated on this line feeds the section's meter
    // (last statement of a given score wins). Name-first order preferred,
    // total-first ("= 8/10 PAS") accepted.
    const sc = SCORE_LINE_RE.exec(line);
    const rv = sc ? null : SCORE_LINE_REV_RE.exec(line);
    const rawName = sc ? sc[1] : rv ? rv[2] : null;
    const rawValue = sc ? sc[2] : rv ? rv[1] : null;
    if (rawName && rawValue) {
      const name = rawName.toUpperCase() === "PAS" ? "PAS" : "Alvarado";
      const value = parseInt(rawValue, 10);
      if (value <= 10) {
        const scores = cur().scores.filter((s) => s.name !== name);
        scores.push({ name, value });
        cur().scores = scores;
      }
    }
  }
  return sections.filter((s) => s.num || s.blocks.length > 0);
}

// **bold** → styled emphasis; an unclosed ** while streaming stays plain.
// The "ember" tone is scoped to the (vi) referral card only — warm emphasis
// carries decision-weight there and must not be generalized elsewhere.
function inlineBold(t: string, tone: "cold" | "ember" = "cold") {
  const parts = t.split("**");
  const closed = parts.length % 2 === 1;
  const strongCls =
    tone === "ember"
      ? "font-semibold text-ember-300"
      : "font-semibold text-neutral-100";
  return parts.map((p, i) =>
    i % 2 === 1 && (closed || i < parts.length - 1) ? (
      <strong key={i} className={strongCls}>
        {p}
      </strong>
    ) : (
      p
    ),
  );
}

// Low is deliberately NEUTRAL, never green — a low score must not read as
// reassurance (the false-relief lesson). Equivocal amber, high red. The band
// thresholds live HERE and nowhere else. The meter powers on like the hero
// monitor: cold track first, band-colored fill sweeping segment by segment,
// the total as a glowing mono number — except low, which stays cold, unlit,
// and unrewarding.
function ScoreMeter({ name, value }: { name: string; value: number }) {
  const v = Math.max(0, Math.min(10, value));
  const high = v >= 7;
  const mid = name === "Alvarado" ? v >= 4 && v < 7 : v >= 3 && v < 7;
  const fill = high
    ? "border-red-400 bg-red-400/80"
    : mid
      ? "border-amber-400 bg-amber-400/80"
      : "border-neutral-400 bg-neutral-400/70";
  const band = high ? "high" : mid ? "equivocal" : "low";
  const bandColor = high
    ? "oklch(0.70 0.20 25)"
    : mid
      ? "oklch(0.83 0.16 75)"
      : "oklch(0.78 0.02 255)";
  const bandWord = high
    ? "text-red-300"
    : mid
      ? "text-amber-300"
      : "text-neutral-400";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="w-16 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
        {name}
      </span>
      <span className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="relative h-2.5 w-3 rounded-[2px] border border-neutral-700"
          >
            {i < v && (
              <span
                className={`absolute -inset-px rounded-[2px] border ${fill} origin-left motion-safe:animate-bar-grow`}
                style={{ animationDelay: `${i * 45}ms` }}
              />
            )}
          </span>
        ))}
      </span>
      <span
        aria-hidden
        className="font-mono text-lg font-semibold tabular-nums motion-safe:animate-value-flash"
        style={{
          color: bandColor,
          filter:
            band !== "low" ? `drop-shadow(0 0 6px ${bandColor})` : "none",
        }}
      >
        {v}/10
      </span>
      <span
        aria-hidden
        className={`text-[10px] uppercase tracking-wider ${bandWord}`}
      >
        {band}
      </span>
      <span className="sr-only">{`${name} score ${v} of 10, ${band}`}</span>
    </div>
  );
}

// The consult speaks in two registers (the hero's warm-narrative/cold-
// instrument split, applied to typography): (i), (vi), and any unnumbered
// section are the VOICE — Newsreader serif under an ember-crowned header;
// (ii)–(v) are INSTRUMENTS — cold sans/mono panels that assemble as the
// stream lands. Drifted or contract-free output carries no section numbers,
// so it renders entirely as voice — degradation by construction.
const VOICE_SECTIONS = new Set(["i", "vi"]);
const MIMIC_AXIOM_RE = /ruling one out does not rule out/i;
const CONFIRM_RE = /^confirm:\s*(.+)/i;

// Split "Name — distinguisher" at the first " — ", unless the split would
// leave an odd number of ** on either side (a bold span crossing the
// separator would render as stray asterisks).
function splitMimic(t: string): [string, string | null] {
  const idx = t.indexOf(" — ");
  if (idx === -1) return [t, null];
  const name = t.slice(0, idx);
  const rest = t.slice(idx + 3);
  const odd = (s: string) => (s.split("**").length - 1) % 2 === 1;
  if (odd(name) || odd(rest)) return [t, null];
  return [name, rest];
}

// The (iii) differential as a "not yet excluded" board — the anti-anchoring
// thesis made visible. Rows render in ORIGINAL block order (regrouping would
// misrepresent the wire). Glyphs NEVER change state client-side: only a later
// model turn can close a mimic; the count chip stays hidden until the first
// mimic row exists so a mid-stream board never flashes a reassuring zero.
function MimicBoard({ sec }: { sec: ProseSection }) {
  const isMimicRow = (b: ProseBlock) =>
    b.kind === "bullet" && !MIMIC_AXIOM_RE.test(b.text);
  const count = sec.blocks.filter(isMimicRow).length;
  return (
    <div className="rounded-xl border border-amber-500/25 bg-neutral-900/40 p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] text-neutral-500">
            ({sec.num})
          </span>
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-amber-300/90">
            {sec.title}
          </span>
        </div>
        {count > 0 && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80">
            {count} not excluded
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-col divide-y divide-neutral-800/60">
        {sec.blocks.map((b, bi) => {
          if (isMimicRow(b)) {
            const [name, rest] = splitMimic(b.text);
            return (
              <div
                key={bi}
                className="grid grid-cols-[auto_1fr] gap-2.5 py-2 motion-safe:animate-reveal-in"
              >
                <span aria-hidden className="mt-px text-[13px] text-amber-400">
                  ◌
                </span>
                <span>
                  <span className="sr-only">not yet excluded: </span>
                  <span className="text-sm font-semibold text-neutral-100">
                    {inlineBold(name)}
                  </span>
                  {rest !== null && (
                    <span className="block text-[12px] leading-snug text-neutral-500">
                      {inlineBold(rest)}
                    </span>
                  )}
                </span>
              </div>
            );
          }
          const axiom = MIMIC_AXIOM_RE.test(b.text);
          return (
            <p
              key={bi}
              className={
                axiom
                  ? "my-1 border-l-2 border-ember-500/30 py-1.5 pl-3 font-vignette text-[14.5px] italic leading-relaxed text-ember-300/90"
                  : "py-1.5 text-[14px] leading-relaxed text-neutral-300"
              }
            >
              {b.kind === "step" ? `${b.n}. ` : ""}
              {inlineBold(b.text)}
            </p>
          );
        })}
      </div>
    </div>
  );
}

// The (vi) referral counsel as the consult's dawn ceremony — a warm decision
// card carrying the clinician's own transfer time as a cold chip. The dawn
// wash stays at 0.12 alpha, never brighter: a stronger dawn over an equivocal
// referral would read as relief.
function ReferralCard({
  sec,
  transfer,
}: {
  sec: ProseSection;
  transfer?: string;
}) {
  return (
    <div className="relative mt-2 overflow-hidden rounded-xl border border-ember-500/25 bg-neutral-900/60 p-4 motion-safe:animate-reveal-in">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.73 0.15 62 / 0.12), transparent)",
        }}
      />
      <div className="relative flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ember-400/80">
            {sec.title || "The referral question"}
          </span>
          <span className="rounded border border-neutral-800 bg-neutral-950/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-neutral-400">
            transfer · {transfer || "not given"}
          </span>
        </div>
        {sec.scores.map((s) => (
          <ScoreMeter key={`${s.name}-${s.value}`} name={s.name} value={s.value} />
        ))}
        {sec.blocks.map((b, bi) => {
          const closer = /verify, you decide/i.test(b.text);
          if (b.kind === "bullet")
            return (
              <div
                key={bi}
                className="flex gap-2 font-vignette text-[15px] leading-relaxed text-neutral-100"
              >
                <span aria-hidden className="mt-[1px] text-ember-500/70">
                  •
                </span>
                <span>{inlineBold(b.text, "ember")}</span>
              </div>
            );
          return (
            <p
              key={bi}
              className={
                closer
                  ? "font-vignette text-[15px] italic leading-relaxed text-ember-300/90"
                  : "font-vignette text-[16px] leading-snug text-neutral-100"
              }
            >
              {b.kind === "step" ? `${b.n}. ` : ""}
              {inlineBold(b.text, "ember")}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function ConsultProse({
  text,
  transfer,
}: {
  text: string;
  transfer?: string;
}) {
  const sections = parseConsultProse(text);
  // Tick-off worklist state — per message, ephemeral like everything else.
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      {sections.map((sec, si) => {
        if (sec.num === "iii") return <MimicBoard key={si} sec={sec} />;
        if (sec.num === "vi")
          return <ReferralCard key={si} sec={sec} transfer={transfer} />;

        const isVoice = !sec.num || VOICE_SECTIONS.has(sec.num);
        const isAlarm = sec.num === "iv";
        return (
          <div
            key={si}
            className={`flex flex-col gap-1.5 ${
              isAlarm
                ? "rounded-lg border border-red-900/50 bg-red-950/15 p-3"
                : isVoice && sec.num
                  ? "mt-1.5"
                  : ""
            }`}
          >
            {sec.num && (
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-neutral-500">
                  ({sec.num})
                </span>
                <span
                  className={
                    isAlarm
                      ? "text-[11.5px] font-semibold uppercase tracking-wider text-red-300"
                      : isVoice
                        ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-ember-400/70"
                        : "text-[11.5px] font-semibold uppercase tracking-wider text-neutral-400"
                  }
                >
                  {isAlarm && (
                    <span
                      aria-hidden
                      className="mr-1.5 text-[11px] text-red-400"
                    >
                      ⚠
                    </span>
                  )}
                  {sec.title}
                  {isAlarm && (
                    <span className="sr-only"> — red flags, can't-miss</span>
                  )}
                </span>
              </div>
            )}
            {sec.scores.length > 0 && (
              <div
                className="my-1 rounded-lg border border-neutral-800 px-3 py-2"
                style={{
                  backgroundColor: "oklch(0.145 0.02 255)",
                  backgroundImage:
                    "linear-gradient(oklch(1 0 0 / 0.028) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.028) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              >
                <div className="flex flex-col gap-1.5">
                  {sec.scores.map((s) => (
                    <ScoreMeter
                      key={`${s.name}-${s.value}`}
                      name={s.name}
                      value={s.value}
                    />
                  ))}
                </div>
              </div>
            )}
            {sec.blocks.map((b, bi) => {
              // The intake-inconsistency flag, stamped. Scoped to (i) and
              // unnumbered sections (a follow-up-turn catch stamps too); the
              // regex demands a colon AND non-empty text after it, so routine
              // "Confirm, doctor…" prose and a half-streamed prefix stay
              // ordinary paragraphs.
              const confirm =
                b.kind !== "step" && (sec.num === "i" || !sec.num)
                  ? CONFIRM_RE.exec(b.text)
                  : null;
              if (confirm) {
                return (
                  <div
                    key={bi}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1"
                  >
                    <span className="inline-block -rotate-3 rounded border border-amber-500/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-300 motion-safe:animate-stamp">
                      Check intake
                    </span>
                    <span className="sr-only">
                      possible intake inconsistency:
                    </span>
                    <span className="text-[14px] leading-relaxed text-amber-200/90">
                      {inlineBold(confirm[1])}
                    </span>
                  </div>
                );
              }
              if (b.kind === "bullet")
                return (
                  <div
                    key={bi}
                    className={`flex gap-2.5 leading-relaxed ${
                      isAlarm
                        ? "text-[14.5px] text-neutral-200"
                        : "text-[14.5px] text-neutral-300"
                    }`}
                  >
                    {isAlarm ? (
                      <>
                        <span
                          aria-hidden
                          className="mt-[1px] text-red-400/80"
                        >
                          ⚠
                        </span>
                        <span className="sr-only">red flag: </span>
                      </>
                    ) : (
                      <span aria-hidden className="mt-[1px] text-neutral-600">
                        •
                      </span>
                    )}
                    <span>{inlineBold(b.text)}</span>
                  </div>
                );
              if (b.kind === "step") {
                const key = `${si}-${bi}`;
                const done = ticked.has(key);
                return (
                  <button
                    key={bi}
                    onClick={() => toggle(key)}
                    className="group flex items-start gap-2.5 text-left"
                    title={done ? "Mark as not done" : "Mark as done"}
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full border text-[11px] tabular-nums transition ${
                        done
                          ? "border-neutral-700 text-neutral-600"
                          : "border-ember-500/60 text-ember-300 group-hover:border-ember-400"
                      }`}
                    >
                      {done ? "✓" : b.n}
                    </span>
                    <span
                      className={`text-[14.5px] leading-relaxed transition ${
                        done ? "text-neutral-600 line-through" : "text-neutral-200"
                      }`}
                    >
                      {inlineBold(b.text)}
                    </span>
                  </button>
                );
              }
              const closer = /verify, you decide/i.test(b.text);
              if (closer)
                return (
                  <p
                    key={bi}
                    className="font-vignette text-[15px] italic leading-relaxed text-ember-300/90"
                  >
                    {inlineBold(b.text)}
                  </p>
                );
              return (
                <p
                  key={bi}
                  className={
                    isVoice
                      ? "font-vignette text-[15.5px] leading-relaxed text-neutral-200"
                      : "text-[14px] leading-relaxed text-neutral-300"
                  }
                >
                  {inlineBold(b.text)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
