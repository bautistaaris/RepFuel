"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NumericInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { updateNutritionTargetAction } from "@/actions/nutrition";
import { withCsrf } from "@/lib/csrf-client";

export function NutritionTargetForm({ csrf, initial }: { csrf: string; initial: { calories: number; protein: number; carbs: number; fat: number } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [calories, setCalories] = useState(initial.calories);
  const [protein, setProtein] = useState(initial.protein);
  const [carbs, setCarbs] = useState(initial.carbs);
  const [fat, setFat] = useState(initial.fat);

  function submit() {
    startTransition(async () => {
      try {
        await updateNutritionTargetAction(withCsrf({ calories, protein, carbs, fat }, csrf));
        router.push("/dieta");
        router.refresh();
      } catch {
        // ignore
      }
    });
  }

  return (
    <Card className="gap-space-md">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Estos son tus objetivos diarios. Se usan para calcular el porcentaje completado.
      </p>
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Calorías (kcal)</span>
        <NumericInput inputMode="decimal" value={calories} onChange={(e) => setCalories(parseFloat(e.target.value) || 0)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Proteína (g)</span>
        <NumericInput inputMode="decimal" value={protein} onChange={(e) => setProtein(parseFloat(e.target.value) || 0)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Carbohidratos (g)</span>
        <NumericInput inputMode="decimal" value={carbs} onChange={(e) => setCarbs(parseFloat(e.target.value) || 0)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Grasas (g)</span>
        <NumericInput inputMode="decimal" value={fat} onChange={(e) => setFat(parseFloat(e.target.value) || 0)} />
      </label>
      <Button variant="primary" size="lg" onClick={submit} disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </Card>
  );
}