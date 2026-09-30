"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createRoutineAction } from "@/actions/routines";
import { withCsrf } from "@/lib/csrf-client";

export function RoutineForm({ csrf, initial }: { csrf: string; initial?: { id?: string; name?: string; description?: string | null } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await createRoutineAction(withCsrf({ name, description: description || undefined }, csrf));
        if (res.ok) router.push(`/entreno/${res.id}`);
        else setError("No se pudo crear la rutina");
      } catch {
        setError("Error inesperado");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-space-md"
    >
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nombre</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          placeholder="PUSH A — Pecho, Hombro & Tríceps"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
          Descripción (opcional)
        </span>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="Notas generales, días sugeridos, etc."
        />
      </label>
      {error && <p className="font-body-md text-body-md text-error">{error}</p>}
      <Button type="submit" variant="primary" size="lg" disabled={pending || !name.trim()}>
        {pending ? "Creando..." : "Crear rutina"}
      </Button>
    </form>
  );
}