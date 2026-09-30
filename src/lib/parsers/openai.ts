import type { NutritionParser, NutritionEstimate } from "./types";

export class OpenAINutritionParser implements NutritionParser {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.NUTRITION_AI_MODEL ?? "gpt-4o-mini",
  ) {}

  async parse(description: string): Promise<NutritionEstimate> {
    if (!description.trim()) {
      return { foods: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, estimated: true, confidence: 0 };
    }

    const sys = `Sos un asistente que convierte descripciones de comidas en lenguaje natural a un JSON con estructura nutricional. Respondé EXCLUSIVAMENTE con JSON válido siguiendo este schema:
{
  "foods": [{ "name": string, "quantity": number, "unit": string, "calories": number, "protein": number, "carbs": number, "fat": number }],
  "totals": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "estimated": true,
  "confidence": number entre 0 y 1,
  "notes"?: string
}
Unidades permitidas: g, ml, unidad, porción, cucharada, taza.
Los valores son POR ÍTEM, no por 100g.`;

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: description },
      ],
      response_format: { type: "json_object" as const },
      temperature: 0.2,
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`OpenAI error: ${res.status}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message?.content ?? "{}";
    let parsed: Partial<NutritionEstimate>;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Respuesta inválida del parser");
    }
    return {
      foods: parsed.foods ?? [],
      totals: parsed.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
      estimated: true,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      notes: parsed.notes,
    };
  }
}