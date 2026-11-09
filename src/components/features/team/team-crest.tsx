import { teamInitials } from "@/lib/slug";
import { cn } from "@/lib/utils";

/**
 * Escudo del equipo dibujado con sus colores: mitad y mitad, con las iniciales.
 * Sirve hasta que se suban escudos con imagen.
 */
export function TeamCrest({
  name,
  primary,
  secondary,
  className,
}: {
  name: string;
  primary: string | null;
  secondary: string | null;
  className?: string;
}) {
  const a = primary ?? "#0e5a36";
  const b = secondary ?? "#ffffff";
  return (
    <svg viewBox="0 0 40 46" className={cn("size-12 shrink-0", className)} aria-hidden>
      <defs>
        <clipPath id={`crest-${a}-${b}`.replace(/#/g, "")}>
          <path d="M20 1 38 7v15c0 11-7.6 19.6-18 23C9.6 41.6 2 33 2 22V7Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${`crest-${a}-${b}`.replace(/#/g, "")})`}>
        <rect width="40" height="46" fill={a} />
        <path d="M20 0h20v46H20Z" fill={b} />
        <rect x="0" y="16" width="40" height="13" fill={a} opacity="0.92" />
      </g>
      <path
        d="M20 1 38 7v15c0 11-7.6 19.6-18 23C9.6 41.6 2 33 2 22V7Z"
        fill="none"
        stroke="rgb(0 0 0 / 0.18)"
        strokeWidth="1.5"
      />
      <text
        x="20"
        y="26.5"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#fff"
        style={{ fontStretch: "75%", letterSpacing: "0.02em" }}
      >
        {teamInitials(name)}
      </text>
    </svg>
  );
}
