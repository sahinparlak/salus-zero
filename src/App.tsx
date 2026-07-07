import { useRef, useState } from "react";

const DEFAULT_PROMPT =
  "It is 02:00 in a rural clinic. In two vivid sentences, set the scene for a lone night-shift doctor. Plain narration only.";

export default function App() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    if (running) return;
    setRunning(true);
    setOutput("");
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setError(`Request failed (${res.status}): ${await res.text()}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <div className="w-full bg-amber-950/40 border-b border-amber-800/50 text-amber-200 text-xs px-4 py-2 text-center">
        TRAINING SIMULATION — not medical advice. Doses and thresholds are
        illustrative.
      </div>

      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-12 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">SALUS Zero</h1>
          <p className="text-neutral-400 mt-1">
            The nearest CT is four hours away. The nearest surgeon is you.
          </p>
        </header>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm leading-relaxed outline-none focus:border-neutral-600"
        />

        <button
          onClick={run}
          disabled={running}
          className="self-start rounded-lg bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50"
        >
          {running ? "Streaming…" : "Run"}
        </button>

        {error && (
          <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="min-h-[8rem] whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-[15px] leading-relaxed">
          {output || (
            <span className="text-neutral-600">
              The narration streams here, token by token…
            </span>
          )}
        </div>

        <footer className="mt-auto pt-8 text-xs text-neutral-600">
          Day 0 — proving the streaming spine. Clinically reviewed by Dr. Şahin
          Parlak (Pediatric Surgery).
        </footer>
      </main>
    </div>
  );
}
