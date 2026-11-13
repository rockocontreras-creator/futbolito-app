import Link from "next/link";
import { APP_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * "Pichanguita": la pelota con cara, mascota del club. Es el logo y acompaña pantallas vacías y de ingreso.
 * `mood` cambia la expresión: contenta (por defecto), guiño o pensativa.
 */
export function Mascot({
  className,
  mood = "happy",
}: {
  className?: string;
  mood?: "happy" | "wink" | "thinking";
}) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("size-9", className)}>
      <defs>
        <clipPath id="pichanguita-clip">
          <circle cx="24" cy="24" r="20.5" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="20.5" fill="#fff" />
      <g clipPath="url(#pichanguita-clip)">
        <g fill="#263b30">
          <path d="M24 3.5l6.2 4.5-2.4 7.3h-7.6l-2.4-7.3z" />
          <path d="M2 17.5l6.5-.8 3.2 5.800-3.7 6.2-7 .3z" />
          <path d="M46 17.5l-6.5-.8-3.2 5.800 3.7 6.2 7 .3z" />
          <path d="M14.5 46l1-5 5.7-2 2.800 2.600 2.800-2.600 5.7 2 1 5z" />
        </g>
        <path
          d="M17.8 8l-7 3.5M30.2 8l7 3.5M20.2 15.3l-8.5 7.2M27.800 15.3l8.5 7.2M8 28.7l6 9.3M40 28.7l-6 9.3"
          fill="none"
          stroke="#263b30"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="#263b30" strokeWidth="3" />
      {mood === "wink" ? (
        <path
          d="M15.3 24.3q2.7-2.6 5.400 0"
          fill="none"
          stroke="#263b30"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ) : (
        <>
          <ellipse cx="19" cy="24.5" rx="2.5" ry="3.3" fill="#263b30" />
          <circle cx="19.8" cy="23.3" r="0.95" fill="#fff" />
        </>
      )}
      <ellipse cx="29" cy="24.5" rx="2.5" ry="3.3" fill="#263b30" />
      <circle cx="29.8" cy="23.3" r="0.95" fill="#fff" />
      {mood === "thinking" ? (
        <path d="M20.5 31.5h7" fill="none" stroke="#263b30" strokeWidth="2.6" strokeLinecap="round" />
      ) : (
        <path
          d="M19.5 30.2q4.5 4.3 9 0"
          fill="none"
          stroke="#263b30"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      )}
      <circle cx="15" cy="29.5" r="1.9" fill="#ff9aa2" fillOpacity=".75" />
      <circle cx="34.800" cy="29.3" r="2.2" fill="#ff9aa2" fillOpacity=".7" />
    </svg>
  );
}

/** Compatibilidad: el logo chico es la mascota. */
export function BrandMark({ className }: { className?: string }) {
  return <Mascot className={className} />;
}

export function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-xl outline-offset-4"
      aria-label={`${APP_NAME}, inicio`}
    >
      <Mascot className="size-10" />
      <span className="flex flex-col leading-none" aria-hidden>
        <span className="text-[12px] font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
          Club de la
        </span>
        <span className="text-[1.45rem] font-display text-primary">Pichanga</span>
      </span>
    </Link>
  );
}
