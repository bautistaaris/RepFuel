import Link from "next/link";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { cn } from "@/lib/utils/cn";

export function AppHeader({
  title,
  backHref,
  right,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
  variant?: "default" | "compact";
}) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className={cn("h-16 px-margin flex items-center justify-between")}>
        <div className="flex items-center gap-space-sm">
          {backHref !== undefined && (
            <Link
              href={backHref}
              className="w-11 h-11 flex items-center justify-center text-on-surface active:scale-95 transition-transform"
              aria-label="Volver"
            >
              <MaterialSymbol name="arrow_back" className="text-[24px]" />
            </Link>
          )}
          {backHref === undefined && (
            <div className="flex items-center gap-space-sm">
              <Logo />
              <span className="font-headline-sm text-headline-sm uppercase text-on-surface font-extrabold tracking-tight">
                RepFuel
              </span>
            </div>
          )}
          {backHref !== undefined && (
            <h1 className={cn("font-headline-sm text-headline-sm uppercase text-on-surface font-extrabold tracking-tight truncate max-w-[200px]")}>
              {title}
            </h1>
          )}
        </div>
        {right && <div className="flex items-center gap-space-sm">{right}</div>}
      </div>
    </header>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-8 w-auto text-primary-fixed fill-current", className)}
      aria-hidden="true"
    >
      <path d="M50 8 L78 60 L62 60 L62 92 L38 92 L38 60 L22 60 Z" />
    </svg>
  );
}