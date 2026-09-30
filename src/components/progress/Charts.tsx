"use client";

import dynamic from "next/dynamic";
import { ProgressBar } from "@/components/ui/ProgressBar";

const WeeklyVolumeChart = dynamic(() => import("./ChartsClient").then((m) => m.WeeklyVolumeChart), { ssr: false });
const WeightLineChart = dynamic(() => import("./ChartsClient").then((m) => m.WeightLineChart), { ssr: false });

export { WeeklyVolumeChart, WeightLineChart };

export function CaloriesChart({ consumed, target }: { consumed: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-sm text-label-sm">Calorías</span>
      <ProgressBar value={pct} tone="primary" glow />
      <span className="font-caption text-caption text-on-surface-variant">{Math.round(consumed)} / {Math.round(target)} kcal</span>
    </div>
  );
}