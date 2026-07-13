// The denial-of-wallet brake, pinned at its four load-bearing behaviors:
// the wall itself, the back-off amnesty (a refused request is NOT counted,
// so one quiet window heals the block instead of re-arming it), the scope
// segment of the key (a night of /api/turn calls must never eat the
// debrief's tighter budget), and the address-spray flush that keeps the
// module-level map from growing without bound. State is a module-level Map
// shared across this whole file, so every test claims its own scope/IP —
// isolation by key, not by reset.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimited, tooManyRequests } from "../functions/lib/rateLimit";

const at = (ip: string) =>
  new Request("http://local.test/api", {
    headers: { "cf-connecting-ip": ip },
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimited — the wall", () => {
  it("admits exactly `limit` requests in a window, refuses the next", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimited(at("10.0.0.1"), 3, "wall")).toBe(false);
    }
    expect(rateLimited(at("10.0.0.1"), 3, "wall")).toBe(true);
  });

  it("keeps addresses apart: one caller at the wall does not tax another", () => {
    expect(rateLimited(at("10.0.1.1"), 1, "peers")).toBe(false);
    expect(rateLimited(at("10.0.1.1"), 1, "peers")).toBe(true);
    expect(rateLimited(at("10.0.1.2"), 1, "peers")).toBe(false);
  });

  it("falls back to one shared 'local' bucket when the CF header is absent", () => {
    const bare = new Request("http://local.test/api");
    expect(rateLimited(bare, 1, "dev")).toBe(false);
    expect(rateLimited(new Request("http://local.test/api"), 1, "dev")).toBe(true);
  });
});

describe("rateLimited — the window and the amnesty", () => {
  it("sweeps stamps out after 60s: the wall is a window, not a ban", () => {
    expect(rateLimited(at("10.0.2.1"), 2, "sweep")).toBe(false); // t=0
    vi.setSystemTime(30_000);
    expect(rateLimited(at("10.0.2.1"), 2, "sweep")).toBe(false); // t=30s
    vi.setSystemTime(45_000);
    expect(rateLimited(at("10.0.2.1"), 2, "sweep")).toBe(true); // both stamps live
    vi.setSystemTime(65_000);
    // t=0 has aged out, only t=30s remains — there is room again.
    expect(rateLimited(at("10.0.2.1"), 2, "sweep")).toBe(false);
  });

  it("does not count the refused request: backing off for one window heals", () => {
    expect(rateLimited(at("10.0.3.1"), 1, "amnesty")).toBe(false); // t=0, counted
    vi.setSystemTime(30_000);
    expect(rateLimited(at("10.0.3.1"), 1, "amnesty")).toBe(true); // refused, NOT counted
    vi.setSystemTime(61_000);
    // Only the t=0 stamp existed and it has expired. Had the t=30s refusal
    // been stamped, it would still be in-window here and re-arm the block.
    expect(rateLimited(at("10.0.3.1"), 1, "amnesty")).toBe(false);
  });
});

describe("rateLimited — the scope key", () => {
  it("a night of turns cannot eat the debrief's budget from the same address", () => {
    expect(rateLimited(at("10.0.4.1"), 1, "turn")).toBe(false);
    expect(rateLimited(at("10.0.4.1"), 1, "turn")).toBe(true); // turn is at its wall
    expect(rateLimited(at("10.0.4.1"), 1, "debrief")).toBe(false); // debrief untouched
  });
});

describe("rateLimited — the spray flush", () => {
  it("forgets everyone once the map passes 10k keys, instead of growing forever", () => {
    // Park one caller at its wall, then spray past the flush threshold.
    expect(rateLimited(at("10.9.0.1"), 1, "spray-victim")).toBe(false);
    expect(rateLimited(at("10.9.0.1"), 1, "spray-victim")).toBe(true);
    for (let i = 0; i < 10_001; i++) {
      rateLimited(at(`10.8.${Math.floor(i / 250)}.${i % 250}`), 1, `spray-${i}`);
    }
    // The flush wiped the victim's stamps too — best-effort brake, honestly:
    // a full map trades history for bounded memory.
    expect(rateLimited(at("10.9.0.1"), 1, "spray-victim")).toBe(false);
  });
});

describe("tooManyRequests", () => {
  it("answers 429 with a retry-after that matches the window", async () => {
    const res = tooManyRequests();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(await res.text()).toContain("slow down");
  });
});
