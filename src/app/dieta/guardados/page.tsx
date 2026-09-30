import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { listSavedFoods, listSavedMeals } from "@/lib/services/nutrition";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { SavedContent } from "@/components/nutrition/SavedContent";
import { getSessionCsrf } from "@/lib/csrf-page";

export const dynamic = "force-dynamic";

export default async function GuardadosPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const csrf = await getSessionCsrf();
  const [foods, meals] = await Promise.all([listSavedFoods(userId), listSavedMeals(userId)]);
  return (
    <AppShell bottomNav={false}>
      <AppHeader title="Guardados" backHref="/dieta" />
      <SavedContent
        csrf={csrf}
        foods={foods.map((f) => ({
          id: f.id,
          name: f.name,
          unit: f.unit,
          defaultQty: f.defaultQty,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
        }))}
        meals={meals.map((m) => ({
          id: m.id,
          name: m.name,
          totalCalories: m.items.reduce((a, i) => a + i.calories, 0),
          totalProtein: m.items.reduce((a, i) => a + i.protein, 0),
          totalCarbs: m.items.reduce((a, i) => a + i.carbs, 0),
          totalFat: m.items.reduce((a, i) => a + i.fat, 0),
          itemCount: m.items.length,
        }))}
      />
    </AppShell>
  );
}