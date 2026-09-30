import { describe, expect, it } from "vitest";

function movingAvg(values: number[], window: number): number | null {
  if (values.length === 0) return null;
  const slice = values.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function deltaFromPrior(values: number[], daysBack: number): number | null {
  if (values.length === 0) return null;
  const idx = Math.max(0, values.length - 1 - daysBack);
  const current = values[values.length - 1];
  const prior = values[idx];
  if (current === undefined || prior === undefined) return null;
  return current - prior;
}

describe("body weight helpers", () => {
  it("moving average 7d uses last 7 entries", () => {
    const series = [70, 70, 70.5, 71, 71, 70.8, 70.5, 71, 71.2];
    const ma = movingAvg(series, 7);
    expect(ma).not.toBeNull();
    expect(ma!).toBeCloseTo((70.5 + 71 + 71 + 70.8 + 70.5 + 71 + 71.2) / 7, 4);
  });

  it("moving average returns null for empty series", () => {
    expect(movingAvg([], 7)).toBeNull();
  });

  it("deltaFromPrior computes difference over N entries", () => {
    const series = [70, 70, 70.5, 71, 71, 70.8, 70.5];
    expect(deltaFromPrior(series, 6)).toBeCloseTo(0.5, 4);
    expect(deltaFromPrior(series, 1)).toBeCloseTo(-0.3, 4);
  });

  it("deltaFromPrior returns null for empty series", () => {
    expect(deltaFromPrior([], 7)).toBeNull();
  });
});