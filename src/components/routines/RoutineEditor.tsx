"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  addExerciseToRoutineAction,
  removeExerciseFromRoutineAction,
  reorderRoutineExercisesAction,
  updateRoutineExerciseAction,
} from "@/actions/routines";
import { withCsrf } from "@/lib/csrf-client";

type RoutineExercise = {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  position: number;
  targetSets: number;
  restSeconds: number;
  notes: string | null;
};

type LibraryExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  isCustom: boolean;
};

export function RoutineEditor({
  routineId,
  exercises,
  availableExercises,
  csrf,
}: {
  routineId: string;
  exercises: RoutineExercise[];
  availableExercises: LibraryExercise[];
  csrf: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(exercises);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = Array.from(new Set(availableExercises.map((e) => e.muscleGroup))).sort();
  const filtered = availableExercises.filter((e) => {
    if (filterGroup && e.muscleGroup !== filterGroup) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function persistOrder(next: RoutineExercise[]) {
    setItems(next);
    startTransition(async () => {
      await reorderRoutineExercisesAction(
        withCsrf({ routineId, orderedIds: next.map((e) => e.id) }, csrf),
      );
      router.refresh();
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    persistOrder(next);
  }

  function add(exId: string) {
    setShowPicker(false);
    setSearch("");
    startTransition(async () => {
      await addExerciseToRoutineAction(withCsrf({ routineId, exerciseId: exId }, csrf));
      router.refresh();
    });
  }

  function remove(reId: string) {
    if (!confirm("¿Quitar este ejercicio de la rutina?")) return;
    startTransition(async () => {
      await removeExerciseFromRoutineAction(reId);
      router.refresh();
    });
  }

  function updateField(reId: string, patch: { targetSets?: number; restSeconds?: number }) {
    startTransition(async () => {
      await updateRoutineExerciseAction(withCsrf({ id: reId, ...patch }, csrf));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-space-md">
      {items.map((ex, idx) => (
        <Card key={ex.id} level="low" className="gap-space-sm">
          <div className="flex items-start gap-space-sm">
            <div className="flex flex-col gap-1">
              <button
                disabled={pending || idx === 0}
                onClick={() => move(idx, -1)}
                className="w-7 h-7 rounded bg-surface-container text-on-surface-variant flex items-center justify-center disabled:opacity-30"
                aria-label="Subir"
              >
                <MaterialSymbol name="keyboard_arrow_up" className="text-[16px]" />
              </button>
              <button
                disabled={pending || idx === items.length - 1}
                onClick={() => move(idx, 1)}
                className="w-7 h-7 rounded bg-surface-container text-on-surface-variant flex items-center justify-center disabled:opacity-30"
                aria-label="Bajar"
              >
                <MaterialSymbol name="keyboard_arrow_down" className="text-[16px]" />
              </button>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-space-xs mb-1 flex-wrap">
                <Badge tone={ex.muscleGroup === "Pecho" ? "primary" : ex.muscleGroup === "Hombro" ? "secondary" : "tertiary"}>
                  {ex.muscleGroup}
                </Badge>
                {ex.equipment && (
                  <span className="font-caption text-caption text-on-surface-variant">{ex.equipment}</span>
                )}
              </div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">{ex.name}</h4>
              <div className="grid grid-cols-2 gap-2 mt-space-sm">
                <label className="flex flex-col gap-1">
                  <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Series</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    value={ex.targetSets}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) updateField(ex.id, { targetSets: v });
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Descanso (s)</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={900}
                    value={ex.restSeconds}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) updateField(ex.id, { restSeconds: v });
                    }}
                  />
                </label>
              </div>
            </div>
            <button
              disabled={pending}
              onClick={() => remove(ex.id)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant"
              aria-label="Quitar"
            >
              <MaterialSymbol name="delete" className="text-[18px]" />
            </button>
          </div>
        </Card>
      ))}

      <Button onClick={() => setShowPicker(true)} variant="secondary" size="lg">
        <MaterialSymbol name="add" />
        Agregar ejercicio
      </Button>

      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setShowPicker(false)}>
          <div
            className="w-full max-h-[85vh] bg-surface rounded-t-2xl p-space-md flex flex-col gap-space-md pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm">Agregar ejercicio</h3>
              <button onClick={() => setShowPicker(false)} className="w-9 h-9 flex items-center justify-center">
                <MaterialSymbol name="close" />
              </button>
            </div>
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFilterGroup(null)}
                className={
                  "px-3 py-1 rounded-full font-caption text-caption flex-shrink-0 " +
                  (filterGroup === null
                    ? "bg-primary-fixed text-on-primary-fixed"
                    : "bg-surface-container text-on-surface-variant")
                }
              >
                Todos
              </button>
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setFilterGroup(g)}
                  className={
                    "px-3 py-1 rounded-full font-caption text-caption flex-shrink-0 " +
                    (filterGroup === g
                      ? "bg-primary-fixed text-on-primary-fixed"
                      : "bg-surface-container text-on-surface-variant")
                  }
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
              {filtered.map((e) => (
                <button
                  key={e.id}
                  disabled={pending}
                  onClick={() => add(e.id)}
                  className="text-left flex items-center gap-2 p-3 rounded-lg bg-surface-container active:bg-surface-container-high"
                >
                  <MaterialSymbol name="add" className="text-primary-fixed" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-body-lg text-body-lg text-on-surface">{e.name}</span>
                    <span className="font-caption text-caption text-on-surface-variant">{e.muscleGroup}</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center font-body-md text-body-md text-on-surface-variant py-4">
                  Sin resultados
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}