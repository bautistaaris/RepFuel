"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const axisStyle = { fill: "#888", fontSize: 10 } as const;

export function WeeklyVolumeChart({ data }: { data: Array<{ week: string; volume: number }> }) {
  if (data.length === 0) {
    return <p className="font-body-md text-body-md text-on-surface-variant text-center py-4">Sin datos</p>;
  }
  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="week" tickFormatter={(v) => v.slice(5)} tick={axisStyle} stroke="#444" />
          <YAxis tick={axisStyle} stroke="#444" width={32} />
          <Tooltip
            contentStyle={{ background: "#1e2023", border: "1px solid #333", borderRadius: 8 }}
            labelStyle={{ color: "#fff" }}
          />
          <Bar dataKey="volume" fill="#caf300" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeightLineChart({ series }: { series: Array<{ date: string; kg: number }> }) {
  if (series.length === 0) {
    return <p className="font-body-md text-body-md text-on-surface-variant text-center py-4">Sin registros</p>;
  }
  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#333" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={axisStyle} stroke="#444" />
          <YAxis tick={axisStyle} stroke="#444" domain={["auto", "auto"]} width={36} />
          <Tooltip
            contentStyle={{ background: "#1e2023", border: "1px solid #333", borderRadius: 8 }}
            labelStyle={{ color: "#fff" }}
          />
          <Line type="monotone" dataKey="kg" stroke="#caf300" strokeWidth={2} dot={{ r: 3, fill: "#caf300" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExerciseHistoryLineChart({ data }: { data: Array<{ date: string; weight: number | null; reps: number | null; volume: number }> }) {
  if (data.length === 0) return null;
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#333" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={axisStyle} stroke="#444" />
          <YAxis yAxisId="left" tick={axisStyle} stroke="#444" width={32} />
          <YAxis yAxisId="right" orientation="right" tick={axisStyle} stroke="#444" width={32} />
          <Tooltip
            contentStyle={{ background: "#1e2023", border: "1px solid #333", borderRadius: 8 }}
            labelStyle={{ color: "#fff" }}
          />
          <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#caf300" strokeWidth={2} name="Peso (kg)" dot={{ r: 3, fill: "#caf300" }} />
          <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#7bd0ff" strokeWidth={2} name="Volumen" dot={{ r: 2, fill: "#7bd0ff" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}