import { useEffect, useRef, useState } from "react";
// Type-only import: erased at build time, so nothing from functions/ ever
// enters the client bundle. The data itself arrives via GET /api/case.
import type { PublicCase } from "../functions/lib/caseSpec";

type Vitals = PublicCase["initialVitals"];

interface RegisteredAction {
  id: string;
  label: string;
  costMin: number;
}

interface OrderedEntry {
  id: string;
  atMin: number;
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

// Mirror of the worker's composeTurnMessage, so the history we send back is
// the same text the model originally saw. Kept as a copy on purpose: a value
// import from functions/ would pull worker code into the client bundle.
// Change together with functions/lib/prompt.ts composeTurnMessage.
function historyText(entry: TranscriptEntry): string {
  if (entry.role === "world") return entry.text.replace(CONNECTION_NOTE, "").trim();
  if (!entry.meta) return entry.text;
  const parts: string[] = [];
  const typed = entry.text.startsWith("→ ") ? "" : entry.text;
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
      `Requested but NOT available in this hospital (refuse in-world; the request only cost phone time, produce no result): ${entry.meta.attempted
        .map((a) => a.label)
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
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "streaming" | "ready">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [debriefPhase, setDebriefPhase] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

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
    setDebrief(null);
    setDebriefPhase("idle");
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
      setTranscript([{ role: "world", text: "" }]);
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
    // most recent entries up to the cap.
    const entries = transcript.filter((e) => e.text.trim().length > 0);
    const kept =
      entries.length > 29 ? [entries[0], ...entries.slice(-28)] : entries;
    const history = kept.map((e) => ({
      role: e.role === "world" ? "assistant" : "user",
      content: historyText(e).slice(0, 6000),
    }));

    const actionLabel = opts.actionId
      ? caseData.actionCatalog.find((a) => a.id === opts.actionId)?.label
      : undefined;

    setError(null);
    setInput("");
    setPhase("streaming");
    setTranscript((prev) => [
      ...prev,
      { role: "player", text: text ?? `→ ${actionLabel ?? opts.actionId}` },
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
      const entries = transcript.filter((e) => e.text.trim().length > 0);
      const kept =
        entries.length > 120 ? [entries[0], ...entries.slice(-119)] : entries;
      const history = kept.map((e) => ({
        role: e.role === "world" ? "assistant" : "user",
        content: historyText(e).slice(0, 6000),
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <div className="w-full bg-amber-950/40 border-b border-amber-800/50 text-amber-200 text-xs px-4 py-2 text-center">
        TRAINING SIMULATION — not medical advice. Doses and thresholds are
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
            <div className="flex flex-wrap gap-2 items-center">
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm font-medium tabular-nums">
                {wallClock(sim.elapsedMin)}
                <span className="ml-2 text-xs text-neutral-500">
                  T+{Math.round(sim.elapsedMin)} min
                </span>
              </span>
              <span className="rounded-full border border-amber-900/60 bg-amber-950/30 px-3 py-1 text-xs text-amber-300/80">
                ACCELERATED SIMULATION — case clock is compressed
              </span>
            </div>
          )}
        </header>

        {!caseData && (
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-8 flex flex-col items-start gap-4">
            <p className="text-lg text-neutral-200 max-w-xl leading-relaxed">
              Somewhere tonight, a child has abdominal pain — in a hospital
              with no CT, no sonographer, no surgeon in the building. Only a
              clock, and you.
            </p>
            <button
              onClick={beginCase}
              disabled={phase === "loading"}
              className="rounded-lg bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50"
            >
              {phase === "loading" ? "Opening the case…" : "Begin the night shift"}
            </button>
          </section>
        )}

        {error && (
          <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {caseData && sim && (
          <MobileVitalsStrip data={caseData} vitals={sim.vitals} />
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
                            <div className="mt-1.5 text-[11px] tabular-nums">
                              <span className="text-amber-300/70">
                                ⏱ +{entry.meta.turnCostMin} min
                                {entry.meta.registered.length > 0 && (
                                  <>
                                    {" · "}
                                    {entry.meta.registered
                                      .map((a) => a.label)
                                      .join(" · ")}
                                  </>
                                )}
                              </span>
                              {entry.meta.attempted.length > 0 && (
                                <span className="text-red-400/80">
                                  {" · "}
                                  {entry.meta.attempted
                                    .map((a) => `✗ ${a.label} — unavailable`)
                                    .join(" · ")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                          {entry.text}
                          {phase === "streaming" &&
                            i === transcript.length - 1 && (
                              <span className="animate-pulse text-neutral-500">
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
                    <p className="animate-pulse text-amber-300/80">
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

              {sim?.pendingReferral && !sim.caseOver && referralAction && (
                <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-3">
                  <span>
                    Commit to transfer? This starts the referral chain — the
                    ambulance comes from the city, and there is no calling it
                    back.
                  </span>
                  <button
                    onClick={() => sendTurn({ actionId: referralAction.id })}
                    disabled={busy}
                    className="rounded-lg bg-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-300 disabled:opacity-40"
                  >
                    {referralAction.label}
                  </button>
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
                />
              )}
            </section>

            <aside className="flex flex-col gap-6">
              {sim && (
                <VitalsPanel
                  data={caseData}
                  vitals={sim.vitals}
                  elapsedMin={sim.elapsedMin}
                />
              )}
              <ConstraintBoard board={caseData.constraintBoard} />
            </aside>
          </div>
        )}

        <footer className="mt-auto pt-8 text-xs text-neutral-600">
          Built for <em>Built with Claude: Life Sciences</em> · clinically
          reviewed by Dr. Şahin Parlak (Pediatric Surgery).
        </footer>
      </main>
    </div>
  );
}

function DecisionBox({
  caseData,
  input,
  setInput,
  disabled,
  onSend,
  onAction,
}: {
  caseData: PublicCase;
  input: string;
  setInput: (v: string) => void;
  disabled: boolean;
  onSend: () => void;
  onAction: (id: string) => void;
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
              onClick={() => onAction(referral.id)}
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
function MobileVitalsStrip({
  data,
  vitals,
}: {
  data: PublicCase;
  vitals: Vitals;
}) {
  return (
    <div className="md:hidden sticky top-0 z-10 -mx-2 flex gap-2 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950/95 px-2 py-2 backdrop-blur">
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
        return (
          <span
            key={v.key}
            className="shrink-0 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs tabular-nums"
          >
            <span className="text-neutral-500">{v.label.split(" ")[0]}</span>{" "}
            <span className={`font-medium ${tone}`}>
              {value}
              {v.unit ? ` ${v.unit}` : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function VitalsPanel({
  data,
  vitals,
  elapsedMin,
}: {
  data: PublicCase;
  vitals: Vitals;
  elapsedMin: number;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
        Vitals · minute {Math.round(elapsedMin)}
      </h3>
      <ul className="flex flex-col gap-2">
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
          return (
            <li
              key={v.key}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-neutral-400">{v.label}</span>
              <span className="text-right">
                <span className={`font-medium tabular-nums ${tone}`}>
                  {value}
                  {v.unit ? ` ${v.unit}` : ""}
                </span>
                <span className="ml-2 text-[11px] text-neutral-600 tabular-nums">
                  {v.normalLow}–{v.normalHigh}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// The money shot: score gauge + reveal + teaching panels. Everything here is
// render-only — the score arithmetic lives in the worker (score.ts).
function DebriefPanel({
  debrief,
  onRestart,
  onExport,
}: {
  debrief: DebriefData;
  onRestart: () => void;
  onExport: () => void;
}) {
  return (
    <section className="rounded-xl border border-neutral-700 bg-neutral-900/80 p-6 flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-6">
        <ScoreGauge score={debrief.score} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
            Debrief — the night, revealed
          </h2>
          <p className="text-[15px] leading-relaxed text-neutral-100">
            {debrief.groundTruthReveal}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4">
          <h3 className="text-xs uppercase tracking-wider text-emerald-400/90 mb-2.5">
            What you did well
          </h3>
          {debrief.strengths.length === 0 ? (
            <p className="text-sm leading-relaxed text-neutral-400">
              The record offers little to praise tonight — the lesson below is
              where this night's value lives.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-neutral-200">
              {debrief.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-emerald-500">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-4">
          <h3 className="text-xs uppercase tracking-wider text-amber-400/90 mb-2.5">
            What the night cost
          </h3>
          {debrief.misses.length === 0 ? (
            <p className="text-sm leading-relaxed text-neutral-400">
              Nothing consequential — a clean night.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-neutral-200">
              {debrief.misses.map((m, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-amber-500">!</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4">
        <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
          The lesson
        </h3>
        <p className="text-sm leading-relaxed text-neutral-200">
          {debrief.resourceLesson}
        </p>
      </div>

      <div className="rounded-lg border border-sky-900/60 bg-sky-950/20 p-4">
        <h3 className="text-xs uppercase tracking-wider text-sky-400/90 mb-2">
          If this hospital had everything — the other playbook
        </h3>
        <p className="text-sm leading-relaxed text-neutral-300 italic">
          {debrief.ctContrast}
        </p>
      </div>

      <details>
        <summary className="cursor-pointer select-none text-xs uppercase tracking-wider text-neutral-500 transition hover:text-neutral-300">
          How the score was computed
        </summary>
        <div className="mt-3 flex flex-col gap-3">
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

      <div className="flex flex-wrap items-center gap-3">
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

function ScoreGauge({ score }: { score: number }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(score, 100)) / 100;
  const tone =
    score >= 80
      ? "text-emerald-400"
      : score >= 55
        ? "text-amber-400"
        : "text-red-400";
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          className="stroke-neutral-800"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={`${circumference * frac} ${circumference}`}
          className={tone}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-semibold tabular-nums ${tone}`}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">
          / 100
        </span>
      </div>
    </div>
  );
}

function ConstraintBoard({ board }: { board: PublicCase["constraintBoard"] }) {
  const dot: Record<string, string> = {
    available: "bg-emerald-500",
    delayed: "bg-amber-400",
    unavailable: "bg-red-500",
  };
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
        What this hospital has tonight
      </h3>
      <ul className="flex flex-col gap-2.5">
        {board.map((item) => (
          <li key={item.key} className="flex items-start gap-2.5 text-sm">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[item.status]}`}
            />
            <div className="leading-snug">
              <span
                className={
                  item.status === "unavailable"
                    ? "text-neutral-500"
                    : "text-neutral-200"
                }
              >
                {item.label}
              </span>
              {item.status !== "available" && (
                <span className="block text-[11px] text-neutral-500">
                  {item.detail}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
