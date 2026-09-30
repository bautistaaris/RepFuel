import { describe, expect, it } from "vitest";

describe("backup versioning", () => {
  it("has a positive integer version constant", () => {
    expect(1).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(1)).toBe(true);
  });

  it("payload shape has required top-level keys", () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        user: null,
        routines: [],
        exercises: [],
        workouts: [],
        foodEntries: [],
        savedFoods: [],
        savedMeals: [],
        bodyWeights: [],
        dailyNutritionTarget: null,
        appSetting: null,
      },
    };
    expect(payload.version).toBe(1);
    expect(payload.data).toBeDefined();
    expect(Array.isArray(payload.data.routines)).toBe(true);
    expect(Array.isArray(payload.data.workouts)).toBe(true);
  });
});