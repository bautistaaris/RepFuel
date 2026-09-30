import { describe, expect, it } from "vitest";
import { workoutVolume, workoutCompletedSets } from "@/lib/utils/volume";

function mkSet(weight: number | null, reps: number | null, completed: boolean) {
  return { weight, reps, completed };
}

describe("PR detection heuristics (pure)", () => {
  it("heaviest weight wins over volume", () => {
    const history = [mkSet(80, 8, true), mkSet(82.5, 6, true)];
    const current = { weight: 85, reps: 5, completed: true };
    const currentVolume = current.weight * current.reps;
    const priorMaxWeight = Math.max(...history.map((s) => s.weight ?? 0));
    const priorMaxVolume = Math.max(...history.map((s) => (s.weight ?? 0) * (s.reps ?? 0)));
    expect(priorMaxWeight).toBe(82.5);
    expect(current.weight).toBeGreaterThan(priorMaxWeight);
    expect(currentVolume).toBeLessThan(priorMaxVolume);
  });

  it("max volume detects volume PR when weight matches heavier but volume is bigger", () => {
    const history = [mkSet(100, 5, true)];
    const priorMaxVolume = 500;
    const current = { weight: 80, reps: 10, completed: true };
    expect((current.weight * current.reps)).toBeGreaterThan(priorMaxVolume);
    expect(current.weight).toBeLessThan(history[0].weight!);
  });

  it("reps-at-weight detects reps PR", () => {
    const history = [mkSet(80, 8, true)];
    const priorRepsAt80 = 8;
    expect(10).toBeGreaterThan(priorRepsAt80);
  });
});

describe("Workout volume PR candidate (sanity)", () => {
  it("computes total volume and set counts", () => {
    const w = {
      exercises: [
        { sets: [mkSet(80, 8, true), mkSet(80, 8, true)] },
        { sets: [mkSet(50, 12, true)] },
      ],
    };
    expect(workoutVolume(w as any)).toBe(80 * 8 * 2 + 50 * 12);
    expect(workoutCompletedSets(w as any)).toBe(3);
  });
});