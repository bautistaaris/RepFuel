"use client";

import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./ChartsClient").then((m) => m.WeightLineChart), { ssr: false });

export function WeightChart(props: { series: Array<{ date: string; kg: number }> }) {
  return <Chart {...props} />;
}