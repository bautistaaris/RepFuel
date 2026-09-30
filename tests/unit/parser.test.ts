import { describe, expect, it } from "vitest";
import { ManualNutritionParser } from "@/lib/parsers/manual";

describe("ManualNutritionParser", () => {
  const parser = new ManualNutritionParser();

  it("returns empty for empty input", async () => {
    const res = await parser.parse("");
    expect(res.foods).toEqual([]);
    expect(res.totals.calories).toBe(0);
    expect(res.estimated).toBe(true);
  });

  it("parses common foods with quantities", async () => {
    const res = await parser.parse("3 huevos, 90g de avena y una banana");
    expect(res.foods.length).toBeGreaterThanOrEqual(2);
    const egg = res.foods.find((f) => f.name.toLowerCase().includes("huevo"));
    expect(egg).toBeDefined();
    expect(egg!.calories).toBeGreaterThan(0);
  });

  it("computes totals by summing foods", async () => {
    const res = await parser.parse("100g arroz, 100g pollo");
    expect(res.totals.calories).toBeGreaterThan(0);
    expect(res.totals.protein).toBeGreaterThan(0);
  });

  it("marks confidence below 1 when not all foods recognized", async () => {
    const res = await parser.parse("100g arroz y 100g xyzinventado");
    expect(res.confidence).toBeLessThan(1);
    expect(res.notes).toBeDefined();
  });

  it("returns full confidence when all foods known", async () => {
    const res = await parser.parse("100g arroz, 100g pollo");
    expect(res.confidence).toBe(1);
  });
});