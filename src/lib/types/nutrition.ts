export type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER" | "OTHER";

export const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: "Desayuno",
  LUNCH: "Almuerzo",
  SNACK: "Merienda",
  DINNER: "Cena",
  OTHER: "Snacks",
};

export const MEAL_ICONS: Record<MealType, string> = {
  BREAKFAST: "wb_twilight",
  LUNCH: "sunny",
  SNACK: "coffee",
  DINNER: "dinner_dining",
  OTHER: "cookie",
};