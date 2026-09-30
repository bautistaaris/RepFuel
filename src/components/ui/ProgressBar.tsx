import { cn } from "@/lib/utils/cn";

type Tone = "primary" | "secondary" | "tertiary" | "error";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-fixed",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary",
  error: "bg-error",
};

export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  className,
  glow = false,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
  glow?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className={cn("w-full h-2 rounded-full bg-surface-container-highest overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all", toneClasses[tone], glow && tone === "primary" && "shadow-[0_0_8px_rgba(202,243,0,0.6)]")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}