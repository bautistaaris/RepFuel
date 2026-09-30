"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createCustomExerciseAction } from "@/actions/routines";
import { withCsrf } from "@/lib/csrf-client";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  secondaryMuscles: string | null;
  isCustom: boolean;
};

export function BibliotecaContent({
  csrf,
  exercises,
  groups,
  initialFilter,
}: {
  csrf: string;
  exercises: Exercise[];
  groups: string[];
  initialFilter: { muscleGroup?: string; search?: string; customOnly?: boolean };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(initialFilter.search ?? "");
  const [showAdd, setShowAdd] = useState(false);

  function setQuery(patch: Record<string, string | null>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    router.push(`/biblioteca?${sp.toString()}`);
  }

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar ejercicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQuery({ s: search });
          }}
        />
        <Button variant="primary" onClick={() => setQuery({ s: search })}>
          <MaterialSymbol name="search" className="text-[16px]" />
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setQuery({ g: null })}
          className={"px-3 py-1 rounded-full font-caption text-caption uppercase tracking-wider flex-shrink-0 " + (!initialFilter.muscleGroup ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface-variant")}
        >
          Todos
        </button>
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setQuery({ g })}
            className={"px-3 py-1 rounded-full font-caption text-caption uppercase tracking-wider flex-shrink-0 " + (initialFilter.muscleGroup === g ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface-variant")}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="primary" onClick={() => setShowAdd(true)}>
          <MaterialSymbol name="add" className="text-[16px]" />
          Crear ejercicio
        </Button>
      </div>

      {exercises.length === 0 ? (
        <Card>
          <p className="font-body-md text-body-md text-on-surface-variant text-center">Sin resultados.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {exercises.map((e) => (
            <Link key={e.id} href={`/progreso/ejercicios/${e.id}`}>
              <Card level="low" className="flex items-center gap-3 active:scale-[0.99]">
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-body-lg text-body-lg text-on-surface">{e.name}</span>
                    {e.isCustom && <Badge tone="outline">Custom</Badge>}
                  </div>
                  <span className="font-caption text-caption text-on-surface-variant">
                    {e.muscleGroup}
                    {e.equipment ? ` · ${e.equipment}` : ""}
                    {e.secondaryMuscles ? ` · ${e.secondaryMuscles}` : ""}
                  </span>
                </div>
                <MaterialSymbol name="chevron_right" className="text-on-surface-variant" />
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showAdd && (
        <AddExerciseSheet
          csrf={csrf}
          groups={groups}
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

function AddExerciseSheet({
  csrf,
  groups,
  onClose,
  onSaved,
}: {
  csrf: string;
  groups: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [group, setGroup] = useState(groups[0] ?? "Otro");
  const [equipment, setEquipment] = useState("");
  const [secondary, setSecondary] = useState("");

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createCustomExerciseAction(withCsrf({
          name: name.trim(),
          muscleGroup: group,
          equipment: equipment || undefined,
          secondaryMuscles: secondary || undefined,
        }, csrf));
        onSaved();
      } catch {
        // ignore
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end" onClick={onClose}>
      <div className="w-full bg-surface rounded-t-2xl p-space-md pb-safe flex flex-col gap-space-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md">Nuevo ejercicio</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center">
            <MaterialSymbol name="close" />
          </button>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nombre</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Grupo muscular</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-lg text-body-lg">
            {[...groups, "Otro"].map((g) => (<option key={g} value={g}>{g}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Equipo (opcional)</span>
          <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Ej: Mancuernas" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Músculos secundarios (opcional)</span>
          <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder="Ej: Tríceps" />
        </label>
        <Button variant="primary" size="lg" onClick={submit} disabled={pending}>{pending ? "Creando..." : "Crear"}</Button>
      </div>
    </div>
  );
}