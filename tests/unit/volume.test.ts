import { describe, expect, it } from "vitest";
import {
  setVolume,
  exerciseVolume,
  workoutVolume,
  workoutCompletedSets,
  workoutTotalReps,
  workoutDurationSeconds,
} from "@/lib/utils/volume";

describe("volume utilities", () => {
  it("setVolume returns weight*reps for positive values", () => {
    expect(setVolume(80, 8)).toBe(640);
    expect(setVolume(82.5, 6)).toBe(495);
  });

  it("setVolume returns 0 for null or non-positive values", () => {
    expect(setVolume(null, 8)).toBe(0);
    expect(setVolume(80, null)).toBe(0);
    expect(setVolume(0, 8)).toBe(0);
    expect(setVolume(-5, 8)).toBe(0);
  });

  it("exerciseVolume sums only completed sets", () => {
    const sets = [
      { weight: 80, reps: 8, completed: true },
      { weight: 80, reps: 8, completed: true },
      { weight: 82.5, reps: 6, completed: false },
    ];
    expect(exerciseVolume(sets)).toBe(1280);
  });

  it("workoutVolume aggregates all exercises", () => {
    const workout = {
      exercises: [
        { sets: [
          { weight: 80, reps: 8, completed: true },
          { weight: 80, reps: 8, completed: true },
        ] },
        { sets: [
          { weight: 50, reps: 12, completed: true },
        ] },
      ],
    };
    expect(workoutVolume(workout as any)).toBe(80 * 8 * 2 + 50 * 12);
  });

  it("workoutCompletedSets counts completed", () => {
    const workout = {
      exercises: [
        { sets: [
          { weight: 80, reps: 8, completed: true },
          { weight: 80, reps: 8, completed: false },
        ] },
        { sets: [
          { weight: 50, reps: 12, completed: true },
        ] },
      ],
    };
    expect(workoutCompletedSets(workout as any)).toBe(2);
  });

  it("workoutTotalReps sums reps from completed sets", () => {
    const workout = {
      exercises: [
        { sets: [
          { weight: 80, reps: 8, completed: true },
          { weight: 80, reps: 8, completed: false },
        ] },
        { sets: [
          { weight: 50, reps: 12, completed: true },
        ] },
      ],
    };
    expect(workoutTotalReps(workout as any)).toBe(20);
  });

  it("workoutDurationSeconds returns seconds between started and ended", () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const end = new Date("2026-01-01T10:45:00Z");
    expect(workoutDurationSeconds({ startedAt: start, endedAt: end })).toBe(45 * 60);
  });

  it("workoutDurationSeconds falls back to now if endedAt is null", () => {
    const start = new Date(Date.now() - 60_000);
    expect(workoutDurationSeconds({ startedAt: start, endedAt: null })).toBeGreaterThanOrEqual(60);
  });
});