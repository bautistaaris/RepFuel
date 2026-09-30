"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function CalendarDayCell({
  date,
  day,
  info,
  isToday,
}: {
  date: string | null;
  day: number;
  info: { workout: boolean; calories: number; weight: boolean } | null;
  isToday: boolean;
}) {
  if (!date) {
    return <div className="aspect-square" />;
  }
  const dots: string[] = [];
  if (info?.workout) dots.push("bg-primary-fixed");
  if ((info?.calories ?? 0) > 0) dots.push("bg-secondary");
  if (info?.weight) dots.push("bg-tertiary-fixed-dim");

  return (
    <Link
      href={`/calendario/${date.slice(0, 10)}`}
      className={cn(
        "aspect-square rounded-lg flex flex-col items-center justify-center text-body-md font-body-md",
        isToday ? "bg-primary-fixed/15 text-primary-fixed ring-1 ring-primary-fixed" : "bg-surface-container text-on-surface",
        "active:scale-95 transition-transform",
      )}
    >
      <span className="font-label-numeric text-label-sm">{day}</span>
      {dots.length > 0 && (
        <div className="flex gap-0.5 mt-1">
          {dots.map((c, i) => (
            <span key={i} className={cn("w-1.5 h-1.5 rounded-full", c)} />
          ))}
        </div>
      )}
    </Link>
  );
}