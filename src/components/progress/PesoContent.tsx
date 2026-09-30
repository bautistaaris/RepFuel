"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NumericInput, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { addBodyWeightAction, deleteBodyWeightAction } from "@/actions/bodyWeight";
import { withCsrf } from "@/lib/csrf-client";
import { WeightChart } from "./WeightChart";
import { formatDateShort } from "@/lib/utils/dates";
import { formatRelative } from "@/lib/utils/format";

export function PesoContent({
  csrf,
  entries,
  metrics,
}: {
  csrf: string;
  entries: Array<{ id: string; date: string; weightKg: number; notes: string | null }>;
  metrics: { current: number | null; delta7: number | null; delta30: number | null; movingAvg7: number | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  function submit() {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 400) return;
    startTransition(async () => {
      await addBodyWeightAction(withCsrf({ date: new Date().toISOString(), weightKg: w, notes: notes || undefined }, csrf));
      setWeight("");
      setNotes("");
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <Card className="gap-space-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm">Actual</h2>
          <Button size="sm" variant="primary" onClick={() => setShowForm((s) => !s)}>
            <MaterialSymbol name="add" className="text-[16px]" />
            {showForm ? "Cancelar" : "Registrar"}
          </Button>
        </div>
        {metrics.current !== null ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display-hero text-display-hero text-on-surface">{metrics.current.toFixed(1)}</span>
              <span className="font-body-md text-body-md text-on-surface-variant">kg</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Delta label="7 días" value={metrics.delta7} />
              <Delta label="30 días" value={metrics.delta30} />
              <Delta label="MA 7d" value={metrics.movingAvg7 !== null ? metrics.movingAvg7 - metrics.current : null} suffix={metrics.movingAvg7 !== null ? metrics.movingAvg7.toFixed(1) : undefined} />
            </div>
          </div>
        ) : (
          <p className="font-body-md text-body-md text-on-surface-variant">Sin registros.</p>
        )}
      </Card>

      {showForm && (
        <Card className="gap-space-sm">
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Peso (kg)</span>
            <NumericInput inputMode="decimal" step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} autoFocus />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Notas (opcional)</span>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </label>
          <Button variant="primary" size="lg" onClick={submit} disabled={pending || !weight}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </Card>
      )}

      {entries.length > 0 && (
        <Card className="gap-space-sm">
          <h3 className="font-headline-sm text-headline-sm">Tendencia</h3>
          <WeightChart series={entries.slice().reverse().map((e) => ({ date: e.date.slice(0, 10), kg: e.weightKg }))} />
        </Card>
      )}

      <section className="flex flex-col gap-space-sm">
        <h3 className="font-headline-sm text-headline-sm">Historial</h3>
        {entries.length === 0 ? (
          <Card>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">Sin registros.</p>
          </Card>
        ) : (
          entries.map((e) => (
            <Card key={e.id} level="low" className="flex items-center gap-3">
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm">{e.weightKg.toFixed(1)} kg</span>
                  {e.notes && <Badge tone="outline">{e.notes}</Badge>}
                </div>
                <span className="font-caption text-caption text-on-surface-variant">{formatDateShort(new Date(e.date))} · {formatRelative(e.date)}</span>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("¿Eliminar este registro?")) return;
                  await deleteBodyWeightAction(e.id);
                  router.refresh();
                }}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant"
              >
                <MaterialSymbol name="delete" className="text-[18px]" />
              </button>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

function Delta({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  if (value === null) {
    return (
      <div className="p-2 rounded-lg bg-surface-container-low flex flex-col gap-0.5">
        <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{label}</span>
        <span className="font-headline-sm text-headline-sm">—</span>
      </div>
    );
  }
  const isDown = value < 0;
  return (
    <div className="p-2 rounded-lg bg-surface-container-low flex flex-col gap-0.5">
      <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <MaterialSymbol name={isDown ? "arrow_downward" : "arrow_upward"} className="text-[14px] text-secondary" />
        <span className="font-headline-sm text-headline-sm text-on-surface">{Math.abs(value).toFixed(1)}</span>
      </div>
      {suffix && <span className="font-caption text-caption text-on-surface-variant">MA {suffix}</span>}
    </div>
  );
}