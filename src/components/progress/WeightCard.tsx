"use client";

import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";

export function WeightCard({ weight }: { weight: { current: number | null; delta7: number | null; delta30: number | null; movingAvg7: number | null } }) {
  if (weight.current === null) {
    return (
      <Card className="flex flex-col items-center gap-1 text-center">
        <MaterialSymbol name="scale" className="text-[28px] text-on-surface-variant" />
        <span className="font-headline-sm text-headline-sm">Sin registros de peso</span>
        <span className="font-body-md text-body-md text-on-surface-variant">Registrá tu primer peso para ver tendencias.</span>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-space-sm">
      <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Peso actual</span>
      <div className="flex items-baseline gap-2">
        <span className="font-headline-lg text-headline-lg text-on-surface">{weight.current.toFixed(1)}</span>
        <span className="font-body-md text-body-md text-on-surface-variant">kg</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <DeltaCell label="7d" value={weight.delta7} />
        <DeltaCell label="30d" value={weight.delta30} />
        <DeltaCell label="MA 7d" value={weight.movingAvg7 !== null ? weight.movingAvg7 - weight.current : null} suffix={`(${weight.movingAvg7?.toFixed(1)})`} />
      </div>
    </Card>
  );
}

function DeltaCell({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  if (value === null) {
    return (
      <div className="p-2 rounded-lg bg-surface-container-low flex flex-col gap-0.5">
        <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{label}</span>
        <span className="font-headline-sm text-headline-sm text-on-surface">—</span>
      </div>
    );
  }
  const isDown = value < 0;
  return (
    <div className="p-2 rounded-lg bg-surface-container-low flex flex-col gap-0.5">
      <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <MaterialSymbol name={isDown ? "arrow_downward" : "arrow_upward"} className="text-[14px] text-secondary" />
        <span className="font-headline-sm text-headline-sm text-on-surface">{Math.abs(value).toFixed(1)} kg</span>
      </div>
      {suffix && <span className="font-caption text-caption text-on-surface-variant">{suffix}</span>}
    </div>
  );
}