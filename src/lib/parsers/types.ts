export type FoodEstimate = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionEstimate = {
  foods: FoodEstimate[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  estimated: boolean;
  confidence: number;
  notes?: string;
};

export interface NutritionParser {
  readonly name: string;
  parse(description: string): Promise<NutritionEstimate>;
}