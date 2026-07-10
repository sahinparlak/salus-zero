import { useEffect, useRef, useState } from "react";
// Type-only import: erased at build time, so nothing from functions/ ever
// enters the client bundle. The data itself arrives via GET /api/case.
import type { PublicCase } from "../functions/lib/caseSpec";

type Vitals = PublicCase["initialVitals"];

interface RegisteredAction {
  id: string;
  label: string;
  costMin: number;
  // Refused (attempted) actions carry the constraint board's authored reason.
  reason?: string;
}

interface OrderedEntry {
  id: string;
  atMin: number;
}

// One turn's observed vitals, stamped with the minute they were seen. This is
// ONLY ever the values the client already received turn-by-turn (from the
// x-salus-state header) — never a reconstruction of hidden or future
// physiology. The monitor's deltas and trend read straight off this log.
interface VitalsSnapshot {
  atMin: number;
  vitals: Vitals;
}

interface DebriefAxis {
  key: string;
  label: string;
  earned: number;
  max: number;
  lines: string[];
}

// The merged payload from POST /api/debrief: the code-computed score with its
// line-by-line arithmetic, the model's teaching prose, and the authored
// CT-contrast paragraph (which only ever reaches the client inside this).
interface DebriefData {
  score: number;
  axes: DebriefAxis[];
  endReason: "referral" | "clockMax";
  referralStartedAtMin: number | null;
  referTargetByMin: number;
  finalStageId: string;
  groundTruthReveal: string;
  strengths: string[];
  misses: string[];
  resourceLesson: string;
  ctContrast: string;
}

// Authoritative sim state, parsed from the X-Salus-State response header the
// worker sends with every turn. The client never computes any of this.
interface SimState {
  elapsedMin: number;
  vitals: Vitals;
  referralStartedAtMin: number | null;
  // Free text mentioned transfer/referral: the world never executes the one
  // irreversible action from words — the UI asks for an explicit commit.
  pendingReferral: boolean;
  caseOver: boolean;
  endReason: "referral" | "clockMax" | null;
}

interface TranscriptEntry {
  role: "world" | "player";
  text: string;
  // What the player actually TYPED this turn (undefined for click-only
  // turns). The replayed history is rebuilt from this field, so display
  // text and replay text can never collide — typed input beginning with
  // "→ " used to be mistaken for a click placeholder and silently dropped.
  typed?: string;
  // Sim minute the entry occurred at: for player entries the clock they saw
  // when acting (the decision minute), for world entries the clock after the
  // turn resolved. Code-stamped — the debrief uses it to anchor WHEN things
  // were said, since the prose itself carries no reliable time.
  atMin?: number;
  // For player entries: what the hospital system actually registered this
  // turn — echoed back so a mis-parsed free-text order is visible, not hidden.
  // `attempted` = requested but unavailable here (refused in-world).
  meta?: {
    registered: RegisteredAction[];
    attempted: RegisteredAction[];
    turnCostMin: number;
  };
}

// The case starts at 02:00; the wall clock is pure display sugar.
function wallClock(elapsedMin: number): string {
  const total = (120 + Math.round(elapsedMin)) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Display-only note appended to a world entry when its stream is cut. It must
// never travel back to the model as "its own" narration — historyText strips it.
const CONNECTION_NOTE =
  "…(the connection dropped mid-scene; the night went on — carry on from the vitals.)";

// A refresh must not erase the night: every settled state is persisted and
// restored on load. Nothing secret lives client-side, so this is safe. The
// envelope is versioned — bump SESSION_V when the shape changes and old
// sessions are silently dropped instead of half-restored.
const STORAGE_KEY = "salus-zero-session";
// v2: added vitalsLog (the observed-vitals trend). Bumping drops v1 sessions
// on load rather than restoring one without a log.
const SESSION_V = 2;

interface StoredSession {
  v: number;
  caseData: PublicCase;
  transcript: TranscriptEntry[];
  sim: SimState;
  orderedLog: OrderedEntry[];
  vitalsLog: VitalsSnapshot[];
  debrief: DebriefData | null;
}

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (s.v !== SESSION_V || !s.caseData?.id || !s.sim || !Array.isArray(s.transcript))
      return null;
    // Structural guards: a truncated or foreign-written value must degrade
    // to a fresh start, not a render crash on every load.
    if (typeof s.sim.elapsedMin !== "number" || !Array.isArray(s.orderedLog))
      return null;
    if (!Array.isArray(s.vitalsLog)) return null;
    if (s.debrief !== null && !Array.isArray(s.debrief?.axes)) return null;
    // A finished night has nothing a refresh could destroy — restoring it
    // would open the app on a spoiled reveal (or fire an unattended debrief
    // call). Drop it so the landing screen is always the first impression.
    if (s.sim.caseOver) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

// Mirror of the worker's composeTurnMessage, so the history we send back is
// the same text the model originally saw. Kept as a copy on purpose: a value
// import from functions/ would pull worker code into the client bundle.
// Change together with functions/lib/prompt.ts composeTurnMessage.
function historyText(entry: TranscriptEntry): string {
  if (entry.role === "world") return entry.text.replace(CONNECTION_NOTE, "").trim();
  if (!entry.meta) return entry.text;
  const parts: string[] = [];
  // Prefer the recorded typed input; the startsWith fallback only serves
  // entries created before `typed` existed.
  const typed = entry.typed ?? (entry.text.startsWith("→ ") ? "" : entry.text);
  if (typed) parts.push(typed);
  const lines: string[] = [];
  lines.push(
    entry.meta.registered.length > 0
      ? `Actions performed through the hospital system this turn: ${entry.meta.registered
          .map((a) => a.label)
          .join("; ")}.`
      : "No orders went through the hospital system this turn.",
  );
  if (entry.meta.attempted.length > 0) {
    lines.push(
      `Requested but NOT available in this hospital (refuse in-world, grounding the refusal in the stated reason; the request only cost phone time, produce no result): ${entry.meta.attempted
        .map((a) => (a.reason ? `${a.label} (${a.reason})` : a.label))
        .join("; ")}.`,
    );
  }
  lines.push(
    `The case clock has advanced ${entry.meta.turnCostMin} minutes while this happened.`,
  );
  parts.push(`[${lines.join(" ")}]`);
  return parts.join("\n\n");
}

export default function App() {
  const [caseData, setCaseData] = useState<PublicCase | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sim, setSim] = useState<SimState | null>(null);
  const [orderedLog, setOrderedLog] = useState<OrderedEntry[]>([]);
  // The observed-vitals trend — one snapshot appended each turn from the sim
  // state header. Seeds the monitor's deltas and sparkline. Never holds
  // anything the client didn't already see on screen.
  const [vitalsLog, setVitalsLog] = useState<VitalsSnapshot[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "streaming" | "ready">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [debriefPhase, setDebriefPhase] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");
  // UI-owned visibility of the referral confirm strip. Raised by the worker
  // (free-text mention -> pendingReferral) or by the START REFERRAL button —
  // BOTH paths go through the same explicit confirm; nothing ends the case
  // in one click. Recomputed from the state header on every turn.
  const [showReferralConfirm, setShowReferralConfirm] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  // ── Section 2 (consult companion) — the ONLY App-level state it owns. All
  // consult data lives inside <ConsultFlow/> and dies with it on unmount:
  // PHI is ephemeral by construction, nothing consult ever touches
  // localStorage or the sim state above.
  const [consultOpen, setConsultOpen] = useState(false);

  // Restore a persisted session once on load — a refresh (or a judge's
  // accidental swipe) must not erase the night. Settled states only.
  useEffect(() => {
    const s = loadStoredSession();
    if (!s) return;
    setCaseData(s.caseData);
    setTranscript(s.transcript);
    setSim(s.sim);
    setOrderedLog(s.orderedLog);
    setVitalsLog(s.vitalsLog);
    setDebrief(s.debrief);
    setDebriefPhase(s.debrief ? "ready" : "idle");
    setShowReferralConfirm(s.sim.pendingReferral && !s.sim.caseOver);
    setPhase("ready");
  }, []);

  // Persist every settled state. Mid-stream states are deliberately not
  // saved — a refresh during a stream falls back to the last settled turn.
  useEffect(() => {
    if (phase !== "ready" || !caseData || !sim) return;
    try {
      const s: StoredSession = {
        v: SESSION_V,
        caseData,
        transcript,
        sim,
        orderedLog,
        vitalsLog,
        debrief,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* storage full or unavailable — the night just becomes volatile */
    }
  }, [phase, caseData, transcript, sim, orderedLog, vitalsLog, debrief]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    // Follow the stream only while the reader is already at the bottom —
    // never yank someone who scrolled up to reread the night.
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  function applyStateHeader(res: Response) {
    const raw = res.headers.get("x-salus-state");
    if (!raw) return null;
    try {
      const state = JSON.parse(raw) as SimState & {
        turnCostMin: number;
        registeredActions: RegisteredAction[];
        attemptedActions: RegisteredAction[];
        orderedLog: OrderedEntry[];
      };
      setSim({
        elapsedMin: state.elapsedMin,
        vitals: state.vitals,
        referralStartedAtMin: state.referralStartedAtMin,
        pendingReferral: state.pendingReferral ?? false,
        caseOver: state.caseOver,
        endReason: state.endReason,
      });
      setOrderedLog(state.orderedLog);
      // Record this turn's observed vitals for the monitor's trend. Pure
      // append of values already surfaced on screen — no reconstruction.
      setVitalsLog((prev) => [
        ...prev,
        { atMin: state.elapsedMin, vitals: state.vitals },
      ]);
      // Every turn recomputes the confirm strip from the worker's verdict —
      // a button-armed strip that wasn't confirmed clears with the turn.
      setShowReferralConfirm((state.pendingReferral ?? false) && !state.caseOver);
      return state;
    } catch {
      return null;
    }
  }

  async function streamInto(res: Response) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const delta = decoder.decode(value, { stream: true });
      setTranscript((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, text: last.text + delta };
        return next;
      });
    }
  }

  async function beginCase() {
    if (phase === "loading" || phase === "streaming") return;
    setError(null);
    setTranscript([]);
    setSim(null);
    setOrderedLog([]);
    setVitalsLog([]);
    setDebrief(null);
    setDebriefPhase("idle");
    setShowReferralConfirm(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setPhase("loading");
    const controller = new AbortController();
    abortRef.current = controller;
    let loaded: PublicCase | null = null;

    try {
      const caseRes = await fetch("/api/case", { signal: controller.signal });
      if (!caseRes.ok) {
        setError(`Could not load the case (${caseRes.status}).`);
        // Clear any previous session's case too, so "Begin the night shift"
        // is always there as the retry — no dead end after a failed restart.
        setCaseData(null);
        setPhase("idle");
        return;
      }
      loaded = (await caseRes.json()) as PublicCase;
      setCaseData(loaded);
      setPhase("streaming");

      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId: loaded.id, intent: "present" }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setError(
          `The world engine failed (${res.status}): ${await res.text()}`,
        );
        // No progress exists yet — return to the start screen so "Begin the
        // night shift" doubles as the retry button (no dead end).
        setCaseData(null);
        setPhase("idle");
        return;
      }
      applyStateHeader(res);
      setTranscript([{ role: "world", text: "", atMin: 0 }]);
      await streamInto(res);
      setPhase("ready");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
        setCaseData(null);
        setPhase("idle");
      }
    } finally {
      abortRef.current = null;
    }
  }

  async function sendTurn(opts: { text?: string; actionId?: string }) {
    if (!caseData || !sim || phase !== "ready" || sim.caseOver) return;
    const text = opts.text?.trim() || undefined;
    const clicked = opts.actionId ? [opts.actionId] : [];
    if (!text && clicked.length === 0) return;

    // History = the transcript as the model saw it, BEFORE this turn. The
    // opening scene is always kept — it anchors the whole night — plus the
    // most recent entries up to the cap. Filter on the REPLAYED text, not
    // the raw display text: a world entry holding only the connection note
    // strips to "" and would 400 the whole request (min-1 schema) forever.
    const entries = transcript
      .map((e) => ({ role: e.role, replay: historyText(e) }))
      .filter((x) => x.replay.trim().length > 0);
    const kept =
      entries.length > 29 ? [entries[0], ...entries.slice(-28)] : entries;
    const history = kept.map((x) => ({
      role: x.role === "world" ? "assistant" : "user",
      content: x.replay.slice(0, 6000),
    }));

    const actionLabel = opts.actionId
      ? caseData.actionCatalog.find((a) => a.id === opts.actionId)?.label
      : undefined;

    setError(null);
    setInput("");
    setPhase("streaming");
    setTranscript((prev) => [
      ...prev,
      // The player entry is stamped with the clock they SAW when acting —
      // the decision minute, the same semantic the score grades.
      {
        role: "player",
        text: text ?? `→ ${actionLabel ?? opts.actionId}`,
        typed: text,
        atMin: sim.elapsedMin,
      },
      { role: "world", text: "" },
    ]);
    const controller = new AbortController();
    abortRef.current = controller;
    // Once the state header is applied the clock HAS advanced — a later
    // stream failure must not roll the transcript back out from under it.
    let stateApplied = false;

    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caseId: caseData.id,
          intent: "free",
          playerInput: text,
          clickedActions: clicked,
          elapsedMin: sim.elapsedMin,
          orderedLog,
          referralStartedAtMin: sim.referralStartedAtMin,
          history,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setError(
          `The world engine failed (${res.status}): ${await res.text()}`,
        );
        // The turn never happened: roll back the optimistic transcript pair
        // and give the player their typed words back.
        setTranscript((prev) => prev.slice(0, -2));
        if (text) setInput(text);
        setPhase("ready");
        return;
      }
      const state = applyStateHeader(res);
      if (state) {
        stateApplied = true;
        setTranscript((prev) =>
          prev.map((e, i) =>
            i === prev.length - 2
              ? {
                  ...e,
                  meta: {
                    registered: state.registeredActions,
                    attempted: state.attemptedActions ?? [],
                    turnCostMin: state.turnCostMin,
                  },
                }
              : i === prev.length - 1
                ? // The world entry narrates the post-advance world — stamp
                  // it with the clock after the turn resolved.
                  { ...e, atMin: state.elapsedMin }
                : e,
          ),
        );
      }
      await streamInto(res);
      setPhase("ready");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        if (!stateApplied) {
          // The turn never happened: remove the ghost entries and give the
          // player their typed words back.
          setTranscript((prev) => prev.slice(0, -2));
          if (text) setInput(text);
          setError((err as Error).message);
        } else {
          // The turn DID happen (clock advanced) — only the narration was
          // cut. Say so in-world instead of flashing a raw fetch error.
          setTranscript((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = {
              ...last,
              text: (last.text ? last.text + " " : "") + CONNECTION_NOTE,
            };
            return next;
          });
        }
        setPhase("ready");
      }
    } finally {
      abortRef.current = null;
    }
  }

  async function fetchDebrief() {
    if (!caseData || !sim || !sim.caseOver || debriefPhase === "loading") return;
    setDebriefPhase("loading");
    try {
      // The attending reads the WHOLE night, not the turn call's sliding
      // window — capped only against runaway payloads.
      // Filter on the replayed text (same reason as sendTurn: a note-only
      // world entry strips to "" and min-1 would reject the request).
      const entries = transcript
        .map((e) => ({ role: e.role, atMin: e.atMin, replay: historyText(e) }))
        .filter((x) => x.replay.trim().length > 0);
      const kept =
        entries.length > 120 ? [entries[0], ...entries.slice(-119)] : entries;
      // Unlike the turn call's history (which must replay VERBATIM what the
      // world engine saw), the debrief transcript is a different consumer:
      // each entry is prefixed with its app-stamped sim minute so the
      // attending can anchor WHEN things were said.
      const history = kept.map((x) => ({
        role: x.role === "world" ? "assistant" : "user",
        content: (
          (x.atMin !== undefined ? `[minute ${Math.round(x.atMin)}] ` : "") +
          x.replay
        ).slice(0, 6000),
      }));
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caseId: caseData.id,
          elapsedMin: sim.elapsedMin,
          orderedLog,
          referralStartedAtMin: sim.referralStartedAtMin,
          history,
        }),
        // A hung upstream must land in the error+retry state, not leave the
        // "attending is reviewing" pulse spinning forever.
        signal: AbortSignal.timeout(180_000),
      });
      if (!res.ok) throw new Error(`debrief ${res.status}`);
      setDebrief((await res.json()) as DebriefData);
      setDebriefPhase("ready");
    } catch {
      setDebriefPhase("error");
    }
  }

  // The debrief fires by itself the moment the final scene finishes
  // streaming — the player never has to ask for their own reckoning.
  useEffect(() => {
    if (sim?.caseOver && phase === "ready" && debriefPhase === "idle") {
      void fetchDebrief();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim?.caseOver, phase, debriefPhase]);

  // One file with everything a reshoot needs: every input the player typed,
  // every world beat, the order log, and the debrief itself.
  function exportSession() {
    const data = {
      app: "SALUS Zero",
      caseId: caseData?.id,
      exportedAt: new Date().toISOString(),
      endReason: sim?.endReason ?? null,
      elapsedMin: sim?.elapsedMin ?? null,
      orderedLog,
      transcript: transcript.map((e) => ({
        role: e.role,
        text: e.text,
        atMin: e.atMin ?? null,
        meta: e.meta ?? null,
      })),
      debrief,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salus-zero-session-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const busy = phase === "loading" || phase === "streaming";
  const referralAction = caseData?.actionCatalog.find(
    (a) => a.requiresResource === "referral",
  );

  return (
    <div className="relative min-h-screen text-neutral-100 flex flex-col">
      <NightField />
      {!caseData ? (
        consultOpen ? (
          <ConsultFlow
            onExit={() => setConsultOpen(false)}
            onStartSim={() => {
              setConsultOpen(false);
              void beginCase();
            }}
          />
        ) : (
          <ColdOpen
            phase={phase}
            error={error}
            onBegin={beginCase}
            onBringPatient={() => setConsultOpen(true)}
          />
        )
      ) : (
      <>
      <div className="w-full border-b border-neutral-800/60 px-4 py-1.5 text-center text-[11px] tracking-wide text-neutral-500">
        Training simulation — not medical advice. Doses and thresholds are
        illustrative.
      </div>

      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-8 flex flex-col gap-6">
        <header className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              SALUS Zero
            </h1>
            <p className="text-neutral-400 text-sm mt-0.5">
              The nearest CT is four hours away. The nearest surgeon is you.
            </p>
          </div>
          {caseData && sim && (
            // On phones the clock lives in the sticky MobileVitalsStrip; the
            // header clock only shows md+ (where title + clock share a line,
            // so justify-between right-aligns it instead of stranding it).
            <div className="hidden md:block">
              <Clock
                elapsedMin={sim.elapsedMin}
                referralStartedAtMin={sim.referralStartedAtMin}
              />
            </div>
          )}
        </header>

        {error && (
          <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {caseData && sim && (
          <MobileVitalsStrip
            data={caseData}
            vitals={sim.vitals}
            elapsedMin={sim.elapsedMin}
            referralStartedAtMin={sim.referralStartedAtMin}
            vitalsLog={vitalsLog}
          />
        )}

        {caseData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <section className="md:col-span-2 flex flex-col gap-6">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
                <h2 className="text-lg font-medium">{caseData.title}</h2>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-400">
                  <span className="rounded-full border border-neutral-800 px-2.5 py-0.5">
                    {caseData.patient.name}
                  </span>
                  <span className="rounded-full border border-neutral-800 px-2.5 py-0.5">
                    {caseData.patient.ageYears} years ·{" "}
                    {caseData.patient.sex === "male" ? "boy" : "girl"}
                  </span>
                  <span className="rounded-full border border-neutral-800 px-2.5 py-0.5">
                    {caseData.patient.weightKg} kg
                  </span>
                </div>
                <blockquote className="mt-4 border-l-2 border-neutral-700 pl-4 text-[15px] leading-relaxed text-neutral-300 italic">
                  “{caseData.vignette}”
                  <footer className="mt-1 not-italic text-xs text-neutral-500">
                    — his mother, at triage
                  </footer>
                </blockquote>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
                  The ward
                </h3>
                <div
                  ref={transcriptRef}
                  className="max-h-[26rem] overflow-y-auto flex flex-col gap-4 pr-1"
                >
                  {transcript.length === 0 && (
                    <span className="text-neutral-600 text-[15px]">
                      The night unfolds here…
                    </span>
                  )}
                  {transcript.map((entry, i) => (
                    <div key={i}>
                      {entry.role === "player" ? (
                        <div className="rounded-lg border border-neutral-700/70 bg-neutral-800/50 px-4 py-2.5">
                          <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">
                            You
                          </div>
                          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-200">
                            {entry.text}
                          </div>
                          {entry.meta && (
                            <div className="mt-2 flex flex-col gap-2 text-[11px]">
                              <div className="tabular-nums">
                                <span className="text-ember-400/80">
                                  +{entry.meta.turnCostMin} min
                                </span>
                                {entry.meta.registered.length > 0 && (
                                  <span className="text-neutral-400">
                                    {" · "}
                                    {entry.meta.registered
                                      .map((a) => a.label)
                                      .join(" · ")}
                                  </span>
                                )}
                              </div>
                              {/* The signature moment: a request the building
                                  cannot answer is struck out and stamped, not
                                  quietly greyed. This is "you can't order a CT." */}
                              {entry.meta.attempted.map((a, k) => (
                                <div
                                  key={k}
                                  className="flex flex-wrap items-center gap-x-2 gap-y-1"
                                >
                                  <span className="text-sm text-neutral-400 line-through decoration-red-500/60">
                                    {a.label}
                                  </span>
                                  <span className="inline-block -rotate-3 rounded border border-red-500/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-red-300 motion-safe:animate-stamp">
                                    Unavailable here
                                  </span>
                                  {a.reason && (
                                    <span className="text-neutral-500">
                                      — {a.reason}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                          {entry.text}
                          {phase === "streaming" &&
                            i === transcript.length - 1 && (
                              <span
                                aria-hidden
                                className="text-neutral-500 motion-safe:animate-pulse"
                              >
                                ▍
                              </span>
                            )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {sim?.caseOver && phase !== "streaming" && debriefPhase !== "ready" && (
                <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-5 text-sm text-amber-200 leading-relaxed flex flex-col items-start gap-3">
                  <p>
                    <span className="font-semibold">
                      The night is decided.
                    </span>{" "}
                    {sim.endReason === "referral"
                      ? "The referral chain is active — the ambulance is on the road."
                      : "The case clock has run out."}
                  </p>
                  {debriefPhase === "error" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-red-300">
                        The debrief could not be prepared.
                      </span>
                      <button
                        onClick={() => void fetchDebrief()}
                        className="rounded-lg border border-amber-700 bg-amber-900/40 px-4 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-900/70"
                      >
                        Try again
                      </button>
                      <button
                        onClick={beginCase}
                        className="rounded-lg border border-neutral-700 px-4 py-1.5 text-xs text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
                      >
                        Begin another night
                      </button>
                    </div>
                  ) : (
                    <p className="motion-safe:animate-pulse text-amber-300/80">
                      The attending is reviewing the night…
                    </p>
                  )}
                </div>
              )}

              {sim?.caseOver &&
                phase !== "streaming" &&
                debriefPhase === "ready" &&
                debrief && (
                  <DebriefPanel
                    debrief={debrief}
                    onRestart={beginCase}
                    onExport={exportSession}
                  />
                )}

              {showReferralConfirm && sim && !sim.caseOver && referralAction && (
                <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-3">
                  <span>
                    Commit to transfer? This starts the referral chain — the
                    ambulance comes from the city, and there is no calling it
                    back.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowReferralConfirm(false);
                        // Persist the dismissal too — otherwise a refresh
                        // restores pendingReferral and the strip pops back
                        // open. The worker recomputes it fresh every turn.
                        setSim((s) => (s ? { ...s, pendingReferral: false } : s));
                      }}
                      disabled={busy}
                      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200 disabled:opacity-40"
                    >
                      Not yet
                    </button>
                    <button
                      onClick={() => sendTurn({ actionId: referralAction.id })}
                      disabled={busy}
                      className="rounded-lg bg-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-300 disabled:opacity-40"
                    >
                      {referralAction.label}
                    </button>
                  </div>
                </div>
              )}

              {sim && (!sim.caseOver || phase === "streaming") && (
                <DecisionBox
                  caseData={caseData}
                  input={input}
                  setInput={setInput}
                  disabled={busy}
                  onSend={() => sendTurn({ text: input })}
                  onAction={(id) => sendTurn({ actionId: id })}
                  // The one irreversible action never fires from a single
                  // click: the button only ARMS the same confirm strip a
                  // free-text mention raises.
                  onArmReferral={() => setShowReferralConfirm(true)}
                />
              )}
            </section>

            <aside className="flex flex-col gap-6">
              {sim && (
                <VitalsPanel
                  data={caseData}
                  vitals={sim.vitals}
                  elapsedMin={sim.elapsedMin}
                  vitalsLog={vitalsLog}
                />
              )}
              <ConstraintBoard board={caseData.constraintBoard} />
            </aside>
          </div>
        )}

        <footer className="mt-auto pt-8 text-xs text-neutral-600">
          Built for <em>Built with Claude: Life Sciences</em> · clinically
          reviewed by Şahin Parlak, MD (Pediatric Surgery).
        </footer>
      </main>
      </>
      )}
    </div>
  );
}

// The ward at 02:00 — pure atmosphere, no data, fixed behind everything.
// A cold near-black base, one warm sodium lamp pooled off-center over the
// narrative column (the panels are 40% transparent, so it bleeds through
// them and warms that side while the instrument aside stays cold), a colder
// blue pool toward the instrument edge, and a vignette pulling the corners
// of the room into the dark. Opacity-only motion, gated for reduced-motion.
function NightField() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden bg-neutral-950"
    >
      <div
        className="absolute left-[38%] top-[-12%] h-[85vh] w-[85vh] -translate-x-1/2 rounded-full opacity-60 motion-safe:animate-lamp-breath"
        style={{
          background:
            "radial-gradient(circle, oklch(0.73 0.15 62 / 0.16), oklch(0.73 0.15 62 / 0.05) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute right-[-12%] bottom-[-14%] h-[70vh] w-[70vh] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, oklch(0.30 0.05 255 / 0.30), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 45% 28%, transparent 52%, oklch(0.10 0.02 255 / 0.55) 100%)",
        }}
      />
    </div>
  );
}

// The cold open — the first fifteen seconds. No card, no header, no chrome:
// three objects in a wide dark field. The clock holding at 02:00, the hook
// surfacing clause by clause out of the blur, and one warm door in. Shown
// only when no case is loaded, so nothing secret is ever on screen — just
// the night, and its single dynamic value, wallClock(0) = "02:00".
function ColdOpen({
  phase,
  error,
  onBegin,
  onBringPatient,
}: {
  phase: "idle" | "loading" | "streaming" | "ready";
  error: string | null;
  onBegin: () => void;
  onBringPatient: () => void;
}) {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <p className="text-6xl font-semibold leading-none tabular-nums text-neutral-100 motion-safe:animate-reveal-in sm:text-7xl">
        {wallClock(0)}
      </p>

      <div className="flex max-w-xl flex-col gap-4 font-vignette">
        <p
          className="text-lg leading-relaxed text-neutral-300 motion-safe:animate-reveal-in sm:text-xl"
          style={{ animationDelay: "250ms" }}
        >
          Somewhere tonight, a child has abdominal pain.
        </p>
        <p
          className="text-lg leading-relaxed text-neutral-400 motion-safe:animate-reveal-in sm:text-xl"
          style={{ animationDelay: "750ms" }}
        >
          No CT. No sonographer. No surgeon in the building.
        </p>
        <p
          className="text-2xl leading-snug text-neutral-100 motion-safe:animate-reveal-in sm:text-3xl"
          style={{ animationDelay: "1300ms" }}
        >
          The nearest surgeon is you.
        </p>
      </div>

      <button
        onClick={onBegin}
        disabled={phase === "loading"}
        className="rounded-lg bg-ember-400 px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-ember-300 disabled:opacity-60 motion-safe:animate-reveal-in"
        style={{ animationDelay: "1700ms" }}
      >
        {phase === "loading" ? "Opening the case…" : "Begin the night shift"}
      </button>

      {/* The second door — the night you are already in. A quiet lamp burns
          behind it: serif voice like the hook above, instrument small-caps
          below, warm bloom on approach. It must invite without competing
          with the training door's loud ember. */}
      <button
        onClick={onBringPatient}
        className="group relative flex flex-col items-center gap-1 overflow-hidden rounded-xl border border-ember-500/25 bg-neutral-900/40 px-7 py-3.5 transition hover:border-ember-500/60 hover:bg-neutral-900/70 motion-safe:animate-reveal-in"
        style={{ animationDelay: "2100ms" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 -top-6 h-10 rounded-full opacity-60 blur-xl transition group-hover:opacity-100 motion-safe:animate-lamp-breath"
          style={{ background: "oklch(0.73 0.15 62 / 0.14)" }}
        />
        <span className="relative flex items-baseline gap-2 font-vignette text-[17px] text-neutral-200 transition group-hover:text-neutral-50">
          <span
            aria-hidden
            className="h-1.5 w-1.5 self-center rounded-full bg-ember-400/90 motion-safe:animate-lamp-breath"
          />
          …or bring the patient in front of you
        </span>
        <span className="relative text-[10px] uppercase tracking-[0.18em] text-neutral-500 transition group-hover:text-ember-300/90">
          Real patient · resource-aware decision support · prototype
        </span>
      </button>

      {error && (
        <p className="max-w-md rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <p className="mt-4 max-w-md text-[11px] leading-relaxed tracking-wide text-neutral-600">
        Training simulation — not medical advice. Doses and thresholds are
        illustrative.
      </p>
    </main>
  );
}

function DecisionBox({
  caseData,
  input,
  setInput,
  disabled,
  onSend,
  onAction,
  onArmReferral,
}: {
  caseData: PublicCase;
  input: string;
  setInput: (v: string) => void;
  disabled: boolean;
  onSend: () => void;
  onAction: (id: string) => void;
  onArmReferral: () => void;
}) {
  const availableSet = new Set(caseData.resourceProfile.available);
  const referral = caseData.actionCatalog.find(
    (a) => a.requiresResource === "referral",
  );
  const bedside = caseData.actionCatalog.filter(
    (a) =>
      a !== referral &&
      (a.requiresResource === null || availableSet.has(a.requiresResource)),
  );
  const phone = caseData.actionCatalog.filter(
    (a) =>
      a !== referral &&
      a.requiresResource !== null &&
      !availableSet.has(a.requiresResource),
  );

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
          Your move — everything costs time
        </h3>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!disabled && input.trim()) onSend();
              }
            }}
            rows={2}
            disabled={disabled}
            placeholder="Speak, examine, order — in your own words… (Enter to act)"
            className="flex-1 resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-[15px] leading-relaxed placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={disabled || !input.trim()}
            className="self-stretch rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-40"
          >
            Act
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-[11px] uppercase tracking-wider text-neutral-600 mb-1.5">
          At the bedside
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {bedside.map((a) => (
            <ActionButton key={a.id} action={a} disabled={disabled} onAction={onAction} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[11px] uppercase tracking-wider text-neutral-600 mb-1.5">
          The phone — every call costs minutes, and the answer may be no
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {phone.map((a) => (
            <ActionButton key={a.id} action={a} disabled={disabled} onAction={onAction} unavailable />
          ))}
          {referral && (
            <button
              onClick={onArmReferral}
              disabled={disabled}
              className="rounded-lg border border-amber-700 bg-amber-900/40 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-900/70 disabled:opacity-40"
            >
              {referral.label}
              <span className="ml-1.5 font-normal text-amber-400/70 tabular-nums">
                +{referral.baseTimeCostMinutes} min
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  action,
  disabled,
  onAction,
  unavailable,
}: {
  action: PublicCase["actionCatalog"][number];
  disabled: boolean;
  onAction: (id: string) => void;
  unavailable?: boolean;
}) {
  return (
    <button
      onClick={() => onAction(action.id)}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-xs transition disabled:opacity-40 ${
        unavailable
          ? "border-neutral-800 bg-neutral-900/40 text-neutral-500 hover:border-red-900 hover:text-neutral-400"
          : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500"
      }`}
    >
      {unavailable && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500/80 align-middle" />
      )}
      {action.label}
      <span className="ml-1.5 text-neutral-500 tabular-nums">
        +{action.baseTimeCostMinutes} min
      </span>
    </button>
  );
}

// On phones the vitals panel sits below the transcript, off-screen during
// play — this sticky strip keeps the monitor in view. Hidden on md+.
// Display constants — sugar over the sim, the way wallClock invents "02:00".
// NEVER engine arithmetic: the case can end (clockMax) before the ambulance
// arrives, so the ETA is always shown as an approximation ("~06:47").
const AMBULANCE_ETA_MIN = 240; // ~4 hours from the city — the north-star line
const NIGHT_RUNWAY_MIN = 600; // the night's length, for the horizon scale only

// Heat rises monotonically with elapsed time — amber → ember → red. Keyed on
// elapsedMin ONLY (public); never on stage, which is secret. The clock is the
// antagonist: the longer the night runs, the hotter it reads.
function clockHeat(elapsedMin: number): { text: string; bar: string } {
  if (elapsedMin >= 300) return { text: "text-red-400", bar: "bg-red-500" };
  if (elapsedMin >= 150) return { text: "text-ember-400", bar: "bg-ember-500" };
  if (elapsedMin >= 60) return { text: "text-ember-300", bar: "bg-ember-400" };
  return { text: "text-neutral-100", bar: "bg-neutral-500" };
}

// The clock as a first-class antagonist, not a chip. Wall clock large and
// heat-toned; the T+ debt below; a horizon bar for the night's runway bleeding
// away — which resolves to the ambulance ETA once the referral is committed.
function Clock({
  elapsedMin,
  referralStartedAtMin,
}: {
  elapsedMin: number;
  referralStartedAtMin: number | null;
}) {
  const heat = clockHeat(elapsedMin);
  const frac = Math.max(0, Math.min(elapsedMin / NIGHT_RUNWAY_MIN, 1));
  const refAt = referralStartedAtMin;
  const etaClock = refAt !== null ? wallClock(refAt + AMBULANCE_ETA_MIN) : null;

  // The clock doesn't tick — it lurches. Each turn's spent minutes surface as
  // a "wound" that rises off the clock and fades. The number also lives in the
  // transcript, so the flash is skipped entirely under reduced motion.
  const prev = useRef(elapsedMin);
  const woundKey = useRef(0);
  const [wound, setWound] = useState<{ delta: number; key: number } | null>(
    null,
  );
  useEffect(() => {
    const delta = Math.round(elapsedMin - prev.current);
    prev.current = elapsedMin;
    if (delta <= 0 || prefersReducedMotion()) return;
    woundKey.current += 1;
    setWound({ delta, key: woundKey.current });
    const t = setTimeout(() => setWound(null), 1600);
    return () => clearTimeout(t);
  }, [elapsedMin]);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="relative flex items-baseline gap-2">
        <span
          className={`text-3xl font-semibold leading-none tabular-nums transition-colors duration-500 ${heat.text}`}
        >
          {wallClock(elapsedMin)}
        </span>
        {wound && (
          <span
            key={wound.key}
            className="absolute -top-4 right-0 text-xs font-medium tabular-nums text-red-400 motion-safe:animate-wound"
          >
            +{wound.delta} min
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-neutral-500">
        <span>T+{Math.round(elapsedMin)} min</span>
        <span className="text-neutral-700">·</span>
        <span className="tracking-wide">accelerated</span>
      </div>
      {refAt !== null ? (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-ember-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ember-400 motion-safe:animate-pulse" />
          Ambulance dispatched · arriving ~{etaClock}
        </div>
      ) : (
        <div
          className="h-1 w-44 overflow-hidden rounded-full bg-neutral-800"
          title="The night's runway"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${heat.bar}`}
            style={{ width: `${frac * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function MobileVitalsStrip({
  data,
  vitals,
  elapsedMin,
  referralStartedAtMin,
  vitalsLog,
}: {
  data: PublicCase;
  vitals: Vitals;
  elapsedMin: number;
  referralStartedAtMin: number | null;
  vitalsLog: VitalsSnapshot[];
}) {
  const heat = clockHeat(elapsedMin);
  return (
    <div className="md:hidden sticky top-0 z-10 -mx-2 flex gap-2 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950/95 px-2 py-2 backdrop-blur">
      <span className="shrink-0 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs tabular-nums">
        <span className={`font-semibold ${heat.text}`}>
          {wallClock(elapsedMin)}
        </span>
        <span className="ml-1.5 text-neutral-600">
          {referralStartedAtMin !== null
            ? "· amb."
            : `T+${Math.round(elapsedMin)}`}
        </span>
      </span>
      {data.vitalsCatalog.map((v) => {
        const value = vitals[v.key];
        const critical =
          (v.criticalHigh !== null && value >= v.criticalHigh) ||
          (v.criticalLow !== null && value <= v.criticalLow);
        const abnormal = value < v.normalLow || value > v.normalHigh;
        const tone = critical
          ? "text-red-400"
          : abnormal
            ? "text-amber-300"
            : "text-neutral-100";
        const delta = vitalDelta(vitalsLog, v.key);
        const changed = delta !== null && delta !== 0;
        return (
          <span
            key={v.key}
            className="shrink-0 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs tabular-nums"
          >
            <span className="text-neutral-500">{v.label.split(" ")[0]}</span>{" "}
            <span
              key={`${v.key}-${Math.round(elapsedMin)}`}
              className={`font-medium ${tone}${changed ? " motion-safe:animate-value-flash" : ""}`}
            >
              {/* toFixed keeps the decimal stable — "38.0", never a
                  flickering "38" between "37.9" and "38.1" on camera */}
              {value.toFixed(v.precision)}
              {v.unit ? ` ${v.unit}` : ""}
            </span>
            {delta !== null && delta !== 0 && (
              <span className="ml-1 text-[10px] text-neutral-500">
                {delta > 0 ? "▲" : "▼"}
              </span>
            )}
            {(critical || abnormal) && (
              <span className="sr-only">
                {critical ? "critical" : "abnormal"}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// The delta a vital moved since the previous observed turn — null on the very
// first reading. Sign and magnitude only; NEVER colored good/bad by direction,
// because a FALLING pain at perforation is the trap, not good news.
function vitalDelta(log: VitalsSnapshot[], key: keyof Vitals): number | null {
  if (log.length < 2) return null;
  return log[log.length - 1].vitals[key] - log[log.length - 2].vitals[key];
}

function DeltaChip({
  delta,
  precision,
}: {
  delta: number | null;
  precision: number;
}) {
  if (delta === null) return null;
  if (delta === 0)
    return <span className="text-[11px] text-neutral-600">–</span>;
  return (
    <span className="text-[11px] tabular-nums text-neutral-500">
      {delta > 0 ? "▲" : "▼"}
      {Math.abs(delta).toFixed(precision)}
    </span>
  );
}

// Bedside-monitor channel colors, assigned BY INDEX so the engine stays
// domain-agnostic — any case's vitalsCatalog gets sensible channels. No channel
// uses red: red is reserved for alarms. A critical value overrides its channel
// color to alarm-red; an abnormal (but not critical) one goes amber.
const MONITOR_CHANNELS = [
  "oklch(0.86 0.19 150)", // green — ECG
  "oklch(0.84 0.15 78)", // amber — resp
  "oklch(0.84 0.13 200)", // cyan
  "oklch(0.82 0.11 255)", // ice blue
  "oklch(0.84 0.14 185)", // teal — pleth
  "oklch(0.80 0.16 305)", // violet
];
const ALARM_RED = "oklch(0.70 0.20 25)";
const ALARM_AMBER = "oklch(0.83 0.16 75)";

function channelColor(index: number): string {
  return MONITOR_CHANNELS[index % MONITOR_CHANNELS.length];
}

// A monitor trace: the observed-only trend drawn in the bedside idiom — a
// glowing colored line with a bright head at the current value. It plots ONLY
// values already seen turn-by-turn; it never fabricates an ECG morphology or
// interpolates toward an unobserved value (the sim is turn-based, not live).
function MonitorTrace({ values, color }: { values: number[]; color: string }) {
  const w = 132;
  const h = 30;
  if (values.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
        className="mt-1.5 h-7 w-full"
      >
        <line
          x1="0"
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke={color}
          strokeWidth="1.25"
          opacity="0.3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((val, i) => [
    (i / (values.length - 1)) * w,
    h - ((val - min) / range) * (h - 8) - 4,
  ]);
  const d = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const head = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
      className="mt-1.5 h-7 w-full"
      style={{ filter: `drop-shadow(0 0 2.5px ${color})` }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={head[0]} cy={head[1]} r="2.4" fill={color} />
    </svg>
  );
}

// The bedside monitor — a real vital-signs display, not a list. A dark gridded
// screen; one color-coded channel per vital with a glowing number and its
// observed trace; a red alarm blink on anything critical. Values keep
// toFixed(precision) + the code-owned critical/abnormal thresholds; the delta
// stays neutral (a falling pain at perforation is the trap, never good news).
function VitalsPanel({
  data,
  vitals,
  elapsedMin,
  vitalsLog,
}: {
  data: PublicCase;
  vitals: Vitals;
  elapsedMin: number;
  vitalsLog: VitalsSnapshot[];
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-neutral-800 p-5"
      style={{
        backgroundColor: "oklch(0.145 0.02 255)",
        backgroundImage:
          "linear-gradient(oklch(1 0 0 / 0.028) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.028) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-400">
          Monitor
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-neutral-500">
          min {Math.round(elapsedMin)}
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-neutral-800/60">
        {data.vitalsCatalog.map((v, i) => {
          const value = vitals[v.key];
          const critical =
            (v.criticalHigh !== null && value >= v.criticalHigh) ||
            (v.criticalLow !== null && value <= v.criticalLow);
          const abnormal = value < v.normalLow || value > v.normalHigh;
          const color = critical
            ? ALARM_RED
            : abnormal
              ? ALARM_AMBER
              : channelColor(i);
          const delta = vitalDelta(vitalsLog, v.key);
          const changed = delta !== null && delta !== 0;
          const series = vitalsLog.map((e) => e.vitals[v.key]);
          // One animation at a time: a critical channel blinks (alarm); an
          // unchanged-but-moved value flashes once. Never both on one node.
          const anim = critical
            ? " motion-safe:animate-monitor-alarm"
            : changed
              ? " motion-safe:animate-value-flash"
              : "";
          return (
            <li
              key={v.key}
              className="grid grid-cols-[1fr_auto] items-center gap-3 py-3"
            >
              <div className="min-w-0">
                <span className="flex items-center gap-1.5">
                  {/* Non-color severity cue (alarm/caution glyph) beside the
                      color-coded channel label; sr-only word sits by the value. */}
                  {critical ? (
                    <span aria-hidden className="text-[10px] text-red-400">
                      ⚠
                    </span>
                  ) : abnormal ? (
                    <span aria-hidden className="text-[10px] text-amber-400">
                      △
                    </span>
                  ) : null}
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.15em]"
                    style={{ color }}
                  >
                    {v.label}
                  </span>
                </span>
                <MonitorTrace values={series} color={color} />
              </div>
              <div className="flex items-baseline gap-1.5 whitespace-nowrap text-right">
                <span
                  key={`${v.key}-${Math.round(elapsedMin)}`}
                  className={`font-mono text-3xl font-semibold leading-none tabular-nums${anim}`}
                  style={{ color, filter: `drop-shadow(0 0 7px ${color})` }}
                >
                  {/* toFixed keeps the decimal stable — "38.0", never a
                      flickering "38" between "37.9" and "38.1" on camera */}
                  {value.toFixed(v.precision)}
                </span>
                <div className="flex flex-col items-start gap-0.5">
                  {v.unit && (
                    <span className="font-mono text-[10px] text-neutral-500">
                      {v.unit}
                    </span>
                  )}
                  <DeltaChip delta={delta} precision={v.precision} />
                </div>
                {(critical || abnormal) && (
                  <span className="sr-only">
                    {critical ? "critical" : "abnormal"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Reads the OS reduced-motion setting once, synchronously, so animated
// components can start at their final state instead of flashing then jumping.
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// The sim's whole thesis in one line: commit the referral in time. Composed
// PURELY from the payload's authoritative timing (referral minute vs the
// target window), rendered through wallClock — the same display arithmetic
// as the clock chip, never a new clinical claim.
function timingHeadline(d: DebriefData): {
  lead: string;
  line: string;
  late: boolean;
} {
  const target = wallClock(d.referTargetByMin);
  if (d.referralStartedAtMin === null) {
    return {
      lead: "The referral never came.",
      line: `The window closed at ${target} — unanswered.`,
      late: true,
    };
  }
  const delta = Math.round(d.referralStartedAtMin - d.referTargetByMin);
  const at = wallClock(d.referralStartedAtMin);
  if (delta > 0) {
    return {
      lead: `Referred at ${at} — ${delta} minute${delta === 1 ? "" : "s"} late.`,
      line: `The window was ${target}. Right call; the clock was the cost.`,
      late: true,
    };
  }
  return {
    lead: `Referred at ${at} — inside the window.`,
    line: `The window was ${target}. The decision this night turned on.`,
    late: false,
  };
}

// The money shot: the night, revealed and reckoned. Reordered by dramatic
// weight — reveal, verdict, the one thing, the quiet columns, the lesson.
// Everything here is render-only; the score arithmetic lives in the worker
// (score.ts) and only reaches the client after the case is over.
function DebriefPanel({
  debrief,
  onRestart,
  onExport,
}: {
  debrief: DebriefData;
  onRestart: () => void;
  onExport: () => void;
}) {
  const thesis = timingHeadline(debrief);
  return (
    <section className="relative overflow-hidden rounded-2xl border border-ember-500/25 bg-neutral-900/70 p-6 sm:p-8 flex flex-col gap-8">
      {/* Dawn — the one light-turn in the app. A warm wash rising from the
          top edge: the night thinning toward morning as the reckoning is read. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, oklch(0.73 0.15 62 / 0.14), transparent 70%)",
        }}
      />

      {/* 1 · REVEAL — the truth, withheld until the case was over. */}
      <div className="relative motion-safe:animate-reveal-in">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ember-400/80 mb-3">
          The truth, hidden until now
        </p>
        <p className="font-vignette text-[22px] leading-snug text-neutral-100 sm:text-[26px]">
          {debrief.groundTruthReveal}
        </p>
      </div>

      {/* 2 · VERDICT — the gauge, and the three axes it was built from. */}
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        <ScoreGauge score={debrief.score} />
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          {debrief.axes.map((axis) => (
            <AxisBar key={axis.key} axis={axis} />
          ))}
        </div>
      </div>

      {/* 3 · THE ONE THING — the clock, pulled out of the list into a headline. */}
      <div
        className={`relative rounded-xl border p-5 ${
          thesis.late
            ? "border-ember-500/30 bg-ember-500/[0.06]"
            : "border-emerald-800/40 bg-emerald-950/20"
        }`}
      >
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
          The one thing
        </p>
        <p className="font-vignette text-xl leading-snug text-neutral-100 sm:text-[22px]">
          {thesis.lead}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
          {thesis.line}
        </p>
      </div>

      {/* 4 · The quiet columns — kept honest, kept subdued. */}
      <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            What you did well
          </h3>
          {debrief.strengths.length === 0 ? (
            <p className="text-sm leading-relaxed text-neutral-500">
              The record offers little to praise tonight — the lesson below is
              where this night's value lives.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-neutral-300">
              {debrief.strengths.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-emerald-500/80">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            What the night cost
          </h3>
          {debrief.misses.length === 0 ? (
            <p className="text-sm leading-relaxed text-neutral-500">
              Nothing consequential — a clean night.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-neutral-300">
              {debrief.misses.map((m, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-ember-400/80">•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 5 · THE OTHER PLAYBOOK — the thesis this sim exists to teach. The most
          typographic care: the attending's lesson, then the world that had a CT. */}
      <div className="relative rounded-xl border border-neutral-800 bg-neutral-950/50 p-5 sm:p-6">
        <h3 className="mb-3 text-[11px] uppercase tracking-[0.2em] text-ember-400/70">
          The lesson — and the other playbook
        </h3>
        <p className="font-vignette text-lg leading-relaxed text-neutral-200 sm:text-xl">
          {debrief.resourceLesson}
        </p>
        <p className="mt-4 border-l-2 border-ember-500/30 pl-4 font-vignette text-[15px] italic leading-relaxed text-neutral-400 sm:text-base">
          {debrief.ctContrast}
        </p>
      </div>

      {/* Honesty: the full line-by-line arithmetic, one tap away. */}
      <details className="relative">
        <summary className="cursor-pointer select-none text-[11px] uppercase tracking-[0.2em] text-neutral-500 transition hover:text-neutral-300">
          How the score was computed
        </summary>
        <div className="mt-4 flex flex-col gap-3">
          {debrief.axes.map((axis) => (
            <div key={axis.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm text-neutral-300">
                <span>{axis.label}</span>
                <span className="tabular-nums">
                  {axis.earned}/{axis.max}
                </span>
              </div>
              <ul className="mt-1 flex flex-col gap-0.5 text-[13px] leading-relaxed text-neutral-500">
                {axis.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      <div className="relative flex flex-wrap items-center gap-3">
        <button
          onClick={onRestart}
          className="rounded-lg bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white"
        >
          Begin another night
        </button>
        <button
          onClick={onExport}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-xs text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
        >
          Download session log
        </button>
      </div>
    </section>
  );
}

// One score axis as a labeled bar — the arithmetic made legible without
// opening the details. The fill grows from the left on mount (motion-safe).
function AxisBar({ axis }: { axis: DebriefAxis }) {
  const frac =
    axis.max > 0 ? Math.max(0, Math.min(axis.earned / axis.max, 1)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm text-neutral-300">{axis.label}</span>
        <span className="text-sm tabular-nums text-neutral-400">
          {axis.earned}
          <span className="text-neutral-600">/{axis.max}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full origin-left rounded-full bg-ember-400 motion-safe:animate-bar-grow"
          style={{ width: `${frac * 100}%` }}
        />
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(score, 100));
  const frac = target / 100;
  const tone =
    target >= 80
      ? "text-emerald-400"
      : target >= 55
        ? "text-amber-400"
        : "text-red-400";

  // Start at the final state under reduced motion (no flash); otherwise start
  // empty and animate: the ring sweeps to the score, the number counts up.
  const [display, setDisplay] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const [offset, setOffset] = useState(() =>
    circumference * (prefersReducedMotion() ? 1 - frac : 1),
  );

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(target);
      setOffset(circumference * (1 - frac));
      return;
    }
    // Sweep the ring one frame later so the transition has a from-state.
    const rafSweep = requestAnimationFrame(() =>
      setOffset(circumference * (1 - frac)),
    );
    // Count the number up in step with the sweep.
    const start = performance.now();
    const dur = 950;
    let rafCount = 0;
    const step = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * target));
      if (p < 1) rafCount = requestAnimationFrame(step);
    };
    rafCount = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafSweep);
      cancelAnimationFrame(rafCount);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          className="stroke-neutral-800"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${tone} transition-[stroke-dashoffset] duration-[1100ms] ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-semibold tabular-nums ${tone}`}>
          {display}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          / 100
        </span>
      </div>
    </div>
  );
}

// The scarcity ledger: two opposed zones. What's IN THE ROOM (lit, present)
// against what's BEHIND LOCKED DOORS (struck out, each with its authored
// reason). This is the board the whole hidden sim is engineered on — copy and
// layout only; availability is never a live toggle.
function ConstraintBoard({ board }: { board: PublicCase["constraintBoard"] }) {
  const here = board.filter((i) => i.status === "available");
  const gone = board.filter((i) => i.status !== "available");
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h3 className="mb-4 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        What this hospital has tonight
      </h3>

      {here.length > 0 && (
        <div className="mb-5">
          <p className="mb-2.5 text-[10px] uppercase tracking-[0.2em] text-emerald-500/70">
            In the room
          </p>
          <ul className="flex flex-col gap-2">
            {here.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2.5 text-sm text-neutral-200"
              >
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {gone.length > 0 && (
        <div>
          <p className="mb-2.5 text-[10px] uppercase tracking-[0.2em] text-neutral-600">
            Behind locked doors
          </p>
          <ul className="flex flex-col gap-2.5">
            {gone.map((item) => {
              const locked = item.status === "unavailable";
              return (
                <li key={item.key} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-px shrink-0 text-neutral-600"
                  >
                    {locked ? "⊘" : "◷"}
                  </span>
                  <div className="leading-snug">
                    <span
                      className={
                        locked
                          ? "text-sm text-neutral-500 line-through decoration-neutral-700"
                          : "text-sm text-neutral-400"
                      }
                    >
                      {item.label}
                    </span>
                    <span className="block text-[11px] leading-snug text-neutral-500">
                      {item.detail}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

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
  { label: "Bedside glucose + ketones", rural: true },
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

function ConsultFlow({
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
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const delta = decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, text: last.text + delta };
        return next;
      });
    }
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
            <span className="text-[10px] uppercase tracking-[0.14em] text-neutral-600">
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
            <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
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
              <span className="normal-case tracking-normal text-neutral-600">
                (drives which can't-miss diagnoses come forward)
              </span>
            </span>
            <div className="flex gap-2">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
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
              <span className="normal-case tracking-normal text-neutral-600">
                (no imaging needed)
              </span>
            </span>
            <div className="flex flex-wrap gap-2">
              {EXAM_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setExamFindings((prev) => toggleIn(prev, c))}
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
            <span className="text-[10px] text-neutral-600">
              sent with your next message
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
                <span className="text-[10px] tabular-nums text-neutral-600">
                  02 ·
                </span>
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full border border-neutral-600"
                />
                Next domain
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-neutral-600">
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
                      <p className="mt-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs leading-relaxed text-red-300">
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
            <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
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
          <span className="font-mono text-[11px] text-neutral-600">
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
                <span className="font-mono text-[11px] text-neutral-600">
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
