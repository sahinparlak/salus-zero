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
  meta?: { registered: RegisteredAction[]; turnCostMin: number };
}

// The case starts at 02:00; the wall clock is pure display sugar.
function wallClock(elapsedMin: number): string {
  const total = (120 + Math.round(elapsedMin)) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Mirror of the worker's composeTurnMessage, so the history we send back is
// the same text the model originally saw. Kept as a copy on purpose: a value
// import from functions/ would pull worker code into the client bundle.
function historyText(entry: TranscriptEntry): string {
  if (entry.role === "world" || !entry.meta) return entry.text;
  const parts: string[] = [];
  const typed = entry.text.startsWith("→ ") ? "" : entry.text;
  if (typed) parts.push(typed);
  const actionLine =
    entry.meta.registered.length > 0
      ? `Actions performed through the hospital system this turn: ${entry.meta.registered
          .map((a) => a.label)
          .join("; ")}.`
      : "No orders went through the hospital system this turn.";
  parts.push(
    `[${actionLine} The case clock has advanced ${entry.meta.turnCostMin} minutes while this happened.]`,
  );
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
    setPhase("loading");
    const controller = new AbortController();
    abortRef.current = controller;
    let loaded: PublicCase | null = null;

    try {
      const caseRes = await fetch("/api/case", { signal: controller.signal });
      if (!caseRes.ok) {
        setError(`Could not load the case (${caseRes.status}).`);
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
              text:
                (last.text ? last.text + " " : "") +
                "…(the connection dropped mid-scene; the night went on — carry on from the vitals.)",
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
                            <div className="mt-1.5 text-[11px] text-amber-300/70 tabular-nums">
                              ⏱ +{entry.meta.turnCostMin} min
                              {entry.meta.registered.length > 0 && (
                                <>
                                  {" · "}
                                  {entry.meta.registered
                                    .map((a) => a.label)
                                    .join(" · ")}
                                </>
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

              {sim?.caseOver && phase !== "streaming" && (
                <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-5 text-sm text-amber-200 leading-relaxed flex flex-col items-start gap-3">
                  <p>
                    <span className="font-semibold">
                      The night is decided.
                    </span>{" "}
                    {sim.endReason === "referral"
                      ? "The referral chain is active — the ambulance is on the road. What this night cost, and what it taught, comes with the debrief."
                      : "The case clock has run out. What this night cost, and what it taught, comes with the debrief."}
                  </p>
                  <button
                    onClick={beginCase}
                    className="rounded-lg border border-amber-700 bg-amber-900/40 px-4 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-900/70"
                  >
                    Begin another night
                  </button>
                </div>
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
