import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marca: una cancha vista desde arriba, con la línea central y el círculo. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect x="1" y="4" width="30" height="24" rx="5" fill="var(--cancha)" />
      <rect
        x="4"
        y="7"
        width="24"
        height="18"
        rx="1.5"
        fill="none"
        stroke="#fff"
        strokeOpacity=".85"
        strokeWidth="1.4"
      />
      <path d="M16 7v18" stroke="#fff" strokeOpacity=".85" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="3.6" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="1.5" fill="var(--foco)" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-md outline-offset-4"
      aria-label="Futbolito, inicio"
    >
      <BrandMark />
      <span className="text-[1.6rem] font-display text-cancha dark:text-white">Futbolito</span>
    </Link>
  );
}
