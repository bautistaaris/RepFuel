import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim shadow-[0_0_20px_rgba(202,243,0,0.25)]",
  secondary: "bg-surface-container-high text-on-surface hover:bg-surface-bright",
  ghost: "bg-transparent text-on-surface-variant hover:text-on-surface",
  danger: "bg-error-container text-error hover:opacity-90",
  outline:
    "bg-transparent text-on-surface border border-outline-variant hover:bg-surface-container",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 font-label-sm text-label-sm rounded-lg gap-1",
  md: "h-11 px-4 font-headline-sm text-body-lg font-bold rounded-lg gap-2",
  lg: "h-12 px-4 font-headline-sm text-headline-sm font-bold rounded-xl gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </button>
  );
}