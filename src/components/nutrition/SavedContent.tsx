"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";
import { Input, NumericInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  createSavedFoodAction,
  deleteSavedFoodAction,
  createSavedMealAction,
  deleteSavedMealAction,
} from "@/actions/nutrition";
import { withCsrf } from "@/lib/csrf-client";
import { MEAL_LABELS, type MealType } from "@/lib/types/nutrition";
import { formatGrams } from "@/lib/utils/format";

type Food = { id: string; name: string; unit: string; defaultQty: number; calories: number; protein: number; carbs: number; fat: number };
type Meal = { id: string; name: string; totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number; itemCount: number };

export function SavedContent({ csrf, foods, meals }: { csrf: string; foods: Food[]; meals: Meal[] }) {
  const router = useRouter();
  const [showAddFood, setShowAddFood] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [, setLogMealType] = useState<MealType | null>(null);

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <Card className="gap-space-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm">Alimentos frecuentes</h2>
          <Button size="sm" variant="primary" onClick={() => setShowAddFood(true)}>
            <MaterialSymbol name="add" className="text-[16px]" />
            Nuevo
          </Button>
        </div>
        {foods.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant text-center">Sin alimentos guardados.</p>}
        {foods.map((f) => (
          <div key={f.id} className="flex items-center gap-2 p-3 rounded-lg bg-surface-container-low">
            <div className="flex-1 min-w-0">
              <div className="font-body-lg text-body-lg text-on-surface">{f.name}</div>
              <div className="font-caption text-caption text-on-surface-variant">
                {f.defaultQty}{f.unit} · {Math.round(f.calories)} kcal · {formatGrams(f.protein)} P
              </div>
            </div>
            <button onClick={() => setLogMealType((cur) => cur)} className="h-9 px-3 rounded-lg bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
              + Agregar
            </button>
            <button
              onClick={async () => {
                if (!confirm("¿Eliminar?")) return;
                await deleteSavedFoodAction(f.id);
                router.refresh();
              }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant"
            >
              <MaterialSymbol name="delete" className="text-[18px]" />
            </button>
          </div>
        ))}
      </Card>

      <Card className="gap-space-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm">Comidas completas</h2>
          <Button size="sm" variant="primary" onClick={() => setShowAddMeal(true)}>
            <MaterialSymbol name="add" className="text-[16px]" />
            Nueva
          </Button>
        </div>
        {meals.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant text-center">Sin comidas guardadas.</p>}
        {meals.map((m) => (
          <div key={m.id} className="flex items-center gap-2 p-3 rounded-lg bg-surface-container-low">
            <div className="flex-1 min-w-0">
              <div className="font-body-lg text-body-lg text-on-surface uppercase">{m.name}</div>
              <div className="font-caption text-caption text-on-surface-variant">
                {m.itemCount} items · {Math.round(m.totalCalories)} kcal · {formatGrams(m.totalProtein)} P · {formatGrams(m.totalCarbs)} C · {formatGrams(m.totalFat)} G
              </div>
            </div>
            <button onClick={() => setLogMealType((cur) => cur)} className="h-9 px-3 rounded-lg bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
              + Agregar
            </button>
            <button
              onClick={async () => {
                if (!confirm("¿Eliminar?")) return;
                await deleteSavedMealAction(m.id);
                router.refresh();
              }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant"
            >
              <MaterialSymbol name="delete" className="text-[18px]" />
            </button>
          </div>
        ))}
      </Card>

      {false && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end" onClick={() => setLogMealType(null)}>
          <div className="w-full bg-surface rounded-t-2xl p-space-md pb-safe flex flex-col gap-space-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-headline-md text-headline-md">¿En qué toma?</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["BREAKFAST", "LUNCH", "SNACK", "DINNER", "OTHER"] as MealType[]).map((m) => (
                <button
                  key={m}
                  className="h-12 rounded-lg bg-surface-container text-on-surface font-headline-sm text-headline-sm active:scale-95"
                >
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddFood && <AddFoodSheet csrf={csrf} onClose={() => setShowAddFood(false)} onSaved={() => { setShowAddFood(false); router.refresh(); }} />}
      {showAddMeal && <AddMealSheet csrf={csrf} onClose={() => setShowAddMeal(false)} onSaved={() => { setShowAddMeal(false); router.refresh(); }} />}
    </div>
  );
}

function AddFoodSheet({ csrf, onClose, onSaved }: { csrf: string; onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [qty, setQty] = useState(100);
  const [cal, setCal] = useState(0);
  const [p, setP] = useState(0);
  const [c, setC] = useState(0);
  const [f, setF] = useState(0);

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createSavedFoodAction(withCsrf({ name: name.trim(), unit, defaultQty: qty, calories: cal, protein: p, carbs: c, fat: f }, csrf));
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end" onClick={onClose}>
      <div className="w-full bg-surface rounded-t-2xl p-space-md pb-safe flex flex-col gap-space-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-headline-md text-headline-md">Nuevo alimento guardado</h2>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nombre</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Whey chocolate" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Cantidad</span>
            <NumericInput inputMode="decimal" value={qty} onChange={(e) => setQty(parseFloat(e.target.value) || 0)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Unidad</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-lg text-body-lg">
              {["g", "ml", "unidad", "porción", "cucharada", "taza"].map((u) => (<option key={u} value={u}>{u}</option>))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Calorías</span>
            <NumericInput inputMode="decimal" value={cal} onChange={(e) => setCal(parseFloat(e.target.value) || 0)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Proteína</span>
            <NumericInput inputMode="decimal" value={p} onChange={(e) => setP(parseFloat(e.target.value) || 0)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Carbos</span>
            <NumericInput inputMode="decimal" value={c} onChange={(e) => setC(parseFloat(e.target.value) || 0)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Grasas</span>
            <NumericInput inputMode="decimal" value={f} onChange={(e) => setF(parseFloat(e.target.value) || 0)} />
          </label>
        </div>
        <Button variant="primary" size="lg" onClick={submit} disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
      </div>
    </div>
  );
}

function AddMealSheet({ csrf, onClose, onSaved }: { csrf: string; onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [items, setItems] = useState<Array<{ name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }>>([
    { name: "", quantity: 100, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0 },
  ]);

  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 100, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0 }]);
  }

  function updateItem(idx: number, patch: Partial<typeof items[number]>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function submit() {
    if (!name.trim() || items.some((it) => !it.name.trim())) return;
    startTransition(async () => {
      await createSavedMealAction(withCsrf({ name: name.trim(), items }, csrf));
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end" onClick={onClose}>
      <div className="w-full bg-surface rounded-t-2xl p-space-md pb-safe flex flex-col gap-space-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-headline-md text-headline-md">Nueva comida guardada</h2>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nombre</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: PANQUEQUES" />
        </label>
        {items.map((it, idx) => (
          <Card key={idx} level="low" className="gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Item {idx + 1}</span>
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} className="text-error font-label-sm text-label-sm">Quitar</button>
              )}
            </div>
            <label className="flex flex-col gap-1">
              <span className="font-caption text-caption text-on-surface-variant">Nombre</span>
              <Input value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-caption text-caption text-on-surface-variant">Cantidad</span>
                <NumericInput inputMode="decimal" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-caption text-caption text-on-surface-variant">Unidad</span>
                <select value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-lg text-body-lg">
                  {["g", "ml", "unidad", "porción", "cucharada", "taza"].map((u) => (<option key={u} value={u}>{u}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-caption text-caption text-on-surface-variant">Calorías</span>
                <NumericInput inputMode="decimal" value={it.calories} onChange={(e) => updateItem(idx, { calories: parseFloat(e.target.value) || 0 })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-caption text-caption text-on-surface-variant">Proteína</span>
                <NumericInput inputMode="decimal" value={it.protein} onChange={(e) => updateItem(idx, { protein: parseFloat(e.target.value) || 0 })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-caption text-caption text-on-surface-variant">Carbos</span>
                <NumericInput inputMode="decimal" value={it.carbs} onChange={(e) => updateItem(idx, { carbs: parseFloat(e.target.value) || 0 })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-caption text-caption text-on-surface-variant">Grasas</span>
                <NumericInput inputMode="decimal" value={it.fat} onChange={(e) => updateItem(idx, { fat: parseFloat(e.target.value) || 0 })} />
              </label>
            </div>
          </Card>
        ))}
        <Button variant="secondary" size="md" onClick={addItem}>
          <MaterialSymbol name="add" />
          Agregar item
        </Button>
        <Button variant="primary" size="lg" onClick={submit} disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
      </div>
    </div>
  );
}