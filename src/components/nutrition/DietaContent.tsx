"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Input, NumericInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  addFoodEntryAction,
  deleteFoodEntryAction,
  parseNutritionAction,
} from "@/actions/nutrition";
import { withCsrf } from "@/lib/csrf-client";
import { MEAL_LABELS, MEAL_ICONS, type MealType } from "@/lib/types/nutrition";
import { formatGrams } from "@/lib/utils/format";
import type { NutritionEstimate } from "@/lib/parsers/types";

type Entry = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  valuesAreEstimated: boolean;
  createdAt: string;
};

const MEAL_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "SNACK", "DINNER", "OTHER"];

export function DietaContent({
  csrf,
  today,
  targets,
  entries,
  totals,
}: {
  csrf: string;
  today: string;
  targets: { calories: number; protein: number; carbs: number; fat: number };
  entries: Entry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);

  const calPct = Math.min(100, (totals.calories / targets.calories) * 100);
  const proteinPct = Math.min(100, (totals.protein / targets.protein) * 100);
  const carbsPct = Math.min(100, (totals.carbs / targets.carbs) * 100);
  const fatPct = Math.min(100, (totals.fat / targets.fat) * 100);

  const grouped = MEAL_ORDER.map((m) => ({
    type: m,
    entries: entries.filter((e) => e.mealType === m),
    calories: entries.filter((e) => e.mealType === m).reduce((a, e) => a + e.calories, 0),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="flex flex-col gap-space-md px-margin pb-space-xl">
      <Card className="gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm">Resumen del día</h2>
          <div className="flex items-center gap-1">
            <Link href="/dieta/objetivos" className="h-9 px-3 rounded-lg bg-surface-container-high text-primary-fixed font-label-sm text-label-sm flex items-center gap-1">
              <MaterialSymbol name="tune" className="text-[16px]" />
              <span>Objetivos</span>
            </Link>
            <Button size="sm" variant="primary" onClick={() => setShowAdd(true)}>
              <MaterialSymbol name="add" className="text-[16px]" />
              Agregar
            </Button>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Calorías</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline-lg text-headline-lg text-on-surface">{Math.round(totals.calories).toLocaleString("es-AR")}</span>
                <span className="font-body-md text-body-md text-on-surface-variant">/ {Math.round(targets.calories)} kcal</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="font-label-numeric text-label-numeric text-primary-fixed font-bold">
                {Math.max(0, Math.round(targets.calories - totals.calories))}
              </span>
              <span className="font-caption text-caption text-on-surface-variant">kcal restantes</span>
            </div>
          </div>
          <ProgressBar value={calPct} tone="primary" glow />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MacroCell label="Proteína" pct={proteinPct} tone="secondary" value={formatGrams(totals.protein)} target={formatGrams(targets.protein)} />
          <MacroCell label="Carbos" pct={carbsPct} tone="primary" value={formatGrams(totals.carbs)} target={formatGrams(targets.carbs)} />
          <MacroCell label="Grasas" pct={fatPct} tone="error" value={formatGrams(totals.fat)} target={formatGrams(targets.fat)} />
        </div>
      </Card>

      {grouped.length === 0 ? (
        <Card>
          <p className="font-body-md text-body-md text-on-surface-variant text-center">
            Aún no registraste comidas. Tocá Agregar.
          </p>
        </Card>
      ) : (
        grouped.map((g) => (
          <section key={g.type} className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialSymbol name={MEAL_ICONS[g.type]} className="text-[20px] text-primary-fixed" />
                <h3 className="font-headline-sm text-headline-sm">{MEAL_LABELS[g.type]}</h3>
              </div>
              <span className="font-caption text-caption text-on-surface-variant">{Math.round(g.calories)} kcal</span>
            </div>
            {g.entries.map((e) => (
              <Card key={e.id} level="low" className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-body-lg text-body-lg text-on-surface truncate">{e.name}</span>
                    {e.valuesAreEstimated && <Badge tone="outline">aprox.</Badge>}
                  </div>
                  <span className="font-caption text-caption text-on-surface-variant">
                    {e.quantity}{e.unit} · {Math.round(e.calories)} kcal · {formatGrams(e.protein)} P · {formatGrams(e.carbs)} C · {formatGrams(e.fat)} G
                  </span>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm("¿Eliminar este alimento?")) return;
                    await deleteFoodEntryAction(e.id);
                    router.refresh();
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant"
                >
                  <MaterialSymbol name="delete" className="text-[18px]" />
                </button>
              </Card>
            ))}
          </section>
        ))
      )}

      <Link href="/dieta/guardados" className="self-start">
        <Button size="md" variant="secondary">
          <MaterialSymbol name="bookmark" className="text-[16px]" />
          Guardados
        </Button>
      </Link>

      {showAdd && (
        <AddFoodSheet
          csrf={csrf}
          today={today}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function MacroCell({ label, pct, tone, value, target }: { label: string; pct: number; tone: "primary" | "secondary" | "error"; value: string; target: string }) {
  const colorClass = tone === "secondary" ? "text-secondary" : tone === "primary" ? "text-primary-fixed" : "text-tertiary-fixed-dim";
  const barClass = tone === "secondary" ? "bg-secondary" : tone === "primary" ? "bg-primary-fixed" : "bg-error";
  return (
    <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="font-label-sm text-label-sm text-on-surface">{label}</span>
        <span className={"font-caption text-caption " + colorClass}>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
        <div className={"h-full rounded-full " + barClass} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-caption text-caption text-on-surface-variant font-medium">{value} / {target}</span>
    </div>
  );
}

function AddFoodSheet({ csrf, today, onClose, onSaved }: { csrf: string; today: string; onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"manual" | "nl">("manual");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState("g");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [mealType, setMealType] = useState<MealType>("BREAKFAST");
  const [estimated, setEstimated] = useState(false);
  const [nlText, setNlText] = useState("");
  const [estimate, setEstimate] = useState<NutritionEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runParser() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await parseNutritionAction(withCsrf({ description: nlText }, csrf));
        setEstimate(res);
        if (res.foods.length > 0) {
          setName(res.foods.map((f) => f.name).join(", "));
          setQuantity(res.foods.reduce((a, f) => a + f.quantity, 0));
          setUnit("g");
          setCalories(res.totals.calories);
          setProtein(res.totals.protein);
          setCarbs(res.totals.carbs);
          setFat(res.totals.fat);
          setEstimated(true);
          setMode("manual");
        }
      } catch {
        setError("No se pudo estimar. Probá de nuevo o ingresá manualmente.");
      }
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addFoodEntryAction(withCsrf({
          name: name.trim(),
          quantity,
          unit,
          calories,
          protein,
          carbs,
          fat,
          mealType,
          date: today,
          valuesAreEstimated: estimated,
        }, csrf));
        onSaved();
      } catch {
        setError("Datos inválidos");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end" onClick={onClose}>
      <div className="w-full bg-surface rounded-t-2xl p-space-md pb-safe flex flex-col gap-space-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md">Agregar comida</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center"><MaterialSymbol name="close" /></button>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setMode("manual")} className={"flex-1 h-10 rounded-lg font-label-sm text-label-sm " + (mode === "manual" ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface-variant")}>
            Manual
          </button>
          <button onClick={() => setMode("nl")} className={"flex-1 h-10 rounded-lg font-label-sm text-label-sm " + (mode === "nl" ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface-variant")}>
            Describir
          </button>
        </div>

        {mode === "nl" && (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Describe lo que comiste</span>
              <textarea
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                rows={4}
                placeholder="Comí 3 huevos, 90 gramos de avena y una banana"
                className="w-full min-h-[100px] px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-body-lg text-body-lg placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary-fixed/40"
              />
            </label>
            <Button onClick={runParser} variant="primary" disabled={pending || !nlText.trim()}>
              {pending ? "Estimando..." : "Estimar"}
            </Button>
            {estimate && (
              <p className="font-caption text-caption text-on-surface-variant">
                Valores aproximados · confianza {(estimate.confidence * 100).toFixed(0)}%
                {estimate.notes ? ` · ${estimate.notes}` : ""}
              </p>
            )}
          </div>
        )}

        {estimated && <Badge tone="outline">Valores aproximados</Badge>}
        {error && <p className="font-body-md text-body-md text-error">{error}</p>}

        <div className="flex flex-col gap-space-md">
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nombre</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pollo con arroz" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Cantidad</span>
              <NumericInput inputMode="decimal" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Unidad</span>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-lg text-body-lg"
              >
                {["g", "ml", "unidad", "porción", "cucharada", "taza"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Calorías</span>
              <NumericInput inputMode="decimal" value={calories} onChange={(e) => setCalories(parseFloat(e.target.value) || 0)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Proteína (g)</span>
              <NumericInput inputMode="decimal" value={protein} onChange={(e) => setProtein(parseFloat(e.target.value) || 0)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Carbos (g)</span>
              <NumericInput inputMode="decimal" value={carbs} onChange={(e) => setCarbs(parseFloat(e.target.value) || 0)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Grasas (g)</span>
              <NumericInput inputMode="decimal" value={fat} onChange={(e) => setFat(parseFloat(e.target.value) || 0)} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Toma</span>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-lg text-body-lg"
            >
              {MEAL_ORDER.map((m) => (
                <option key={m} value={m}>{MEAL_LABELS[m]}</option>
              ))}
            </select>
          </label>
          <Button variant="primary" size="lg" onClick={submit} disabled={pending || !name.trim()}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}