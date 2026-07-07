import { useRef, useState } from "react";
// Type-only import: erased at build time, so nothing from functions/ ever
// enters the client bundle. The data itself arrives via GET /api/case.
import type { PublicCase } from "../functions/lib/caseSpec";

export default function App() {
  const [caseData, setCaseData] = useState<PublicCase | null>(null);
  const [narrative, setNarrative] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "streaming" | "ready">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function beginCase() {
    if (phase === "loading" || phase === "streaming") return;
    setError(null);
    setNarrative("");
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
        body: JSON.stringify({
          caseId: loaded.id,
          elapsedMin: 0,
          intent: "present",
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setError(
          `The world engine failed (${res.status}): ${await res.text()}`,
        );
        setPhase("ready");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setNarrative((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setPhase("ready");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
        setPhase(loaded ? "ready" : "idle");
      }
    } finally {
      abortRef.current = null;
    }
  }

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
          {caseData && (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
                02:00 · rural district hospital · night shift
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

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 min-h-[14rem]">
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
                  The ward
                </h3>
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {narrative || (
                    <span className="text-neutral-600">
                      The night unfolds here…
                    </span>
                  )}
                  {phase === "streaming" && (
                    <span className="animate-pulse text-neutral-500">▍</span>
                  )}
                </div>
              </div>
            </section>

            <aside className="flex flex-col gap-6">
              <VitalsPanel data={caseData} />
              <ConstraintBoard board={caseData.constraintBoard} />
            </aside>
          </div>
        )}

        <footer className="mt-auto pt-8 text-xs text-neutral-600">
          Day 1 — case-spec engine &amp; constraint board. Clinically reviewed
          by Dr. Şahin Parlak (Pediatric Surgery).
        </footer>
      </main>
    </div>
  );
}

function VitalsPanel({ data }: { data: PublicCase }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
        Vitals · on arrival
      </h3>
      <ul className="flex flex-col gap-2">
        {data.vitalsCatalog.map((v) => {
          const value = data.initialVitals[v.key];
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
