import type { NutritionParser, NutritionEstimate } from "./types";

const KNOWN: Record<string, { cal: number; protein: number; carbs: number; fat: number; unit?: string }> = {
  "huevo": { cal: 155, protein: 13, carbs: 1.1, fat: 11 },
  "huevos": { cal: 155, protein: 13, carbs: 1.1, fat: 11 },
  "avena": { cal: 389, protein: 17, carbs: 66, fat: 7 },
  "banana": { cal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  "manzana": { cal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  "arroz": { cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  "pollo": { cal: 165, protein: 31, carbs: 0, fat: 3.6 },
  "carne": { cal: 250, protein: 26, carbs: 0, fat: 17 },
  "whey": { cal: 380, protein: 80, carbs: 8, fat: 5 },
  "leche": { cal: 42, protein: 3.4, carbs: 5, fat: 1 },
  "yogur": { cal: 60, protein: 4, carbs: 6, fat: 2 },
  "queso": { cal: 300, protein: 22, carbs: 3, fat: 23 },
  "pan": { cal: 265, protein: 9, carbs: 49, fat: 3.2 },
  "miel": { cal: 304, protein: 0.3, carbs: 82, fat: 0 },
  "almendra": { cal: 579, protein: 21, carbs: 22, fat: 50 },
  "atun": { cal: 132, protein: 28, carbs: 0, fat: 1 },
};

export class ManualNutritionParser implements NutritionParser {
  readonly name = "manual";

  async parse(description: string): Promise<NutritionEstimate> {
    const text = description.toLowerCase().trim();
    if (!text) {
      return { foods: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, estimated: true, confidence: 0 };
    }

    const segments = text.split(/[,;y]|\s+(?:con|y|mas|más)\s+/).map((s) => s.trim()).filter(Boolean);
    const foods: NutritionEstimate["foods"] = [];
    let knownCount = 0;

    for (const seg of segments) {
      const { quantity, unit, name } = this.extractQty(seg);
      const matched = this.matchFood(name);
      if (matched) {
        knownCount += 1;
        const factor = quantity / 100;
        foods.push({
          name: matched.displayName,
          quantity,
          unit,
          calories: Math.round(matched.nutrition.cal * factor),
          protein: Math.round(matched.nutrition.protein * factor * 10) / 10,
          carbs: Math.round(matched.nutrition.carbs * factor * 10) / 10,
          fat: Math.round(matched.nutrition.fat * factor * 10) / 10,
        });
      } else {
        foods.push({
          name,
          quantity,
          unit,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        });
      }
    }

    const totals = foods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein: acc.protein + f.protein,
        carbs: acc.carbs + f.carbs,
        fat: acc.fat + f.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    const confidence = foods.length === 0 ? 0 : knownCount / foods.length;
    return {
      foods,
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      },
      estimated: true,
      confidence,
      notes: foods.length === 0
        ? "No se detectaron alimentos. Probá describir cantidades (ej: 3 huevos, 90g avena)."
        : knownCount < foods.length
          ? "Algunos alimentos no se reconocieron. Revisá y completá manualmente."
          : undefined,
    };
  }

  private extractQty(segment: string): { quantity: number; unit: string; name: string } {
    const m = segment.match(/^(\d+(?:[.,]\d+)?)\s*(g|gr|gramos|ml|kg|unidad|unidades|porcion|porción|cucharada|cucharadas|cdita|cdta|taza|tazas)?\s+(?:de\s+)?(.+)$/i);
    if (m) {
      const qty = parseFloat(m[1].replace(",", "."));
      const unitRaw = (m[2] ?? "g").toLowerCase();
      const unit = this.normalizeUnit(unitRaw);
      const name = m[3].trim();
      return { quantity: qty, unit, name };
    }
    const m2 = segment.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|gr|ml|kg|unidad|unidades|porcion|porción|cucharada|cucharadas)?$/i);
    if (m2) {
      const qty = parseFloat(m2[2].replace(",", "."));
      const unitRaw = (m2[3] ?? "g").toLowerCase();
      const unit = this.normalizeUnit(unitRaw);
      const name = m2[1].trim();
      return { quantity: qty, unit, name };
    }
    return { quantity: 100, unit: "g", name: segment };
  }

  private normalizeUnit(u: string): string {
    if (["g", "gr", "gramos"].includes(u)) return "g";
    if (u === "ml") return "ml";
    if (u === "kg") return "g";
    if (["unidad", "unidades"].includes(u)) return "unidad";
    if (["porcion", "porción", "porciones"].includes(u)) return "porción";
    if (["cucharada", "cucharadas", "cdta", "cdita"].includes(u)) return "cucharada";
    if (["taza", "tazas"].includes(u)) return "taza";
    return u;
  }

  private matchFood(input: string): { displayName: string; nutrition: { cal: number; protein: number; carbs: number; fat: number } } | null {
    const cleaned = input
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    for (const [key, value] of Object.entries(KNOWN)) {
      if (cleaned.includes(key)) {
        return {
          displayName: key.charAt(0).toUpperCase() + key.slice(1),
          nutrition: { cal: value.cal, protein: value.protein, carbs: value.carbs, fat: value.fat },
        };
      }
    }
    return null;
  }
}