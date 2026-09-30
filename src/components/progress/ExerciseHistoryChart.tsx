"use client";

import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./ChartsClient").then((m) => m.ExerciseHistoryLineChart), { ssr: false });

export function ExerciseHistoryChart(props: { data: Array<{ date: string; weight: number | null; reps: number | null; volume: number }> }) {
  return <Chart {...props} />;
}