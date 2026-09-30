import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

type Tone = "primary" | "secondary" | "tertiary" | "neutral" | "outline";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-fixed text-on-primary-fixed",
  secondary: "bg-secondary/20 text-secondary",
  tertiary: "bg-tertiary-container text-tertiary",
  neutral: "bg-surface-container-high text-on-surface-variant",
  outline: "bg-transparent border border-outline-variant text-on-surface-variant",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded uppercase font-bold tracking-wide text-caption font-caption",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}