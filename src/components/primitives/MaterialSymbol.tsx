import { cn } from "@/lib/utils/cn";

export function MaterialSymbol({
  name,
  className,
  fill = false,
  size,
}: {
  name: string;
  className?: string;
  fill?: boolean;
  size?: number;
}) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", fill && "fill", className)}
      style={size ? { fontSize: `${size}px` } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}