import { describe, expect, it } from "vitest";

/** In-memory replica of reserve_seats: row lock + conditional decrement. */
function reserveFactory(seats: number) {
  let available = seats;
  const holds: string[] = [];
  let chain = Promise.resolve();
  async function reserve(id: string, n = 1): Promise<boolean> {
    const run = chain.then(async () => {
      await Promise.resolve();
      if (available >= n) {
        available -= n;
        holds.push(id);
        return true;
      }
      return false;
    });
    chain = run.then(() => undefined);
    return run;
  }
  return {
    reserve,
    snapshot: () => ({ available, holds: holds.length }),
  };
}

describe("last-seat race", () => {
  it("100 concurrent requests for 2 seats yield at most 2 reservations", async () => {
    const box = reserveFactory(2);
    const results = await Promise.all(Array.from({ length: 100 }, (_, i) => box.reserve(String(i))));
    const wins = results.filter(Boolean).length;
    expect(wins).toBeLessThanOrEqual(2);
    expect(box.snapshot().holds).toBeLessThanOrEqual(2);
    expect(box.snapshot().available).toBeGreaterThanOrEqual(0);
  });
});
