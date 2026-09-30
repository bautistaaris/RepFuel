import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes, ReactNode } from "react";

type Level = "low" | "base" | "high" | "highest";

const levelClasses: Record<Level, string> = {
  low: "bg-surface-container-low",
  base: "bg-surface-container",
  high: "bg-surface-container-high",
  highest: "bg-surface-container-highest",
};

export function Card({
  level = "base",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  level?: Level;
  children: ReactNode;
}) {
  return (
    <div {...props} className={cn("rounded-xl p-space-md", levelClasses[level], className)}>
      {children}
    </div>
  );
}