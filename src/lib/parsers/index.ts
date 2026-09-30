import type { NutritionParser } from "./types";
import { ManualNutritionParser } from "./manual";
import { OpenAINutritionParser } from "./openai";

let cached: NutritionParser | null = null;

export function getParser(): NutritionParser {
  if (cached) return cached;
  const provider = (process.env.NUTRITION_AI_PROVIDER ?? "none").toLowerCase();
  const key = process.env.NUTRITION_AI_API_KEY;
  if (provider === "openai" && key) {
    cached = new OpenAINutritionParser(key);
  } else {
    cached = new ManualNutritionParser();
  }
  return cached;
}

export function resetParserCache(): void {
  cached = null;
}

export type { NutritionParser, NutritionEstimate, FoodEstimate } from "./types";