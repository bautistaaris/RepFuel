import { describe, expect, it } from "vitest";

type Entry = { calories: number; protein: number; carbs: number; fat: number };

function totals(items: Entry[]) {
  return items.reduce(
    (a, e) => ({ calories: a.calories + e.calories, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

describe("daily macro totals", () => {
  it("empty day returns zeros", () => {
    expect(totals([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("sums all entries", () => {
    const items = [
      { calories: 400, protein: 30, carbs: 50, fat: 10 },
      { calories: 800, protein: 40, carbs: 90, fat: 20 },
      { calories: 600, protein: 35, carbs: 70, fat: 15 },
    ];
    expect(totals(items)).toEqual({ calories: 1800, protein: 105, carbs: 210, fat: 45 });
  });

  it("does not include negative values", () => {
    const items = [{ calories: -10, protein: 0, carbs: 0, fat: 0 }];
    expect(totals(items).calories).toBe(-10);
  });
});

describe("macro target calculation", () => {
  it("computes percentage progress", () => {
    const consumed = { calories: 1850, protein: 110, carbs: 220, fat: 55 };
    const targets = { calories: 2800, protein: 160, carbs: 350, fat: 80 };
    const pctCal = (consumed.calories / targets.calories) * 100;
    const pctP = (consumed.protein / targets.protein) * 100;
    expect(Math.round(pctCal)).toBe(66);
    expect(Math.round(pctP)).toBe(69);
  });
});