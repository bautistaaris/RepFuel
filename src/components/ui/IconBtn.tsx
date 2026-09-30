import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function IconBtn({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={cn(
        "w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
    >
      {children}
    </button>
  );
}