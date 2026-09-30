"use client";

import type { Range } from "@/lib/utils/dates";

const RANGES: { value: Range; label: string }[] = [
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1A" },
  { value: "ALL", label: "Todo" },
];

export function RangeTabs({ current, onChange }: { current: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={
            "h-9 px-3 rounded-full font-label-sm text-label-sm uppercase tracking-wider flex-shrink-0 transition-colors " +
            (current === r.value
              ? "bg-primary-fixed text-on-primary-fixed"
              : "bg-surface-container text-on-surface-variant")
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}