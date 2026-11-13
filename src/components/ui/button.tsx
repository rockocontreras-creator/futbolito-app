import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

// Relieve: el botón tiene un canto sólido abajo y se hunde al apretarlo.
const RELIEVE = "relieve active:translate-y-1 active:shadow-none";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-extrabold whitespace-nowrap transition-[background-color,box-shadow,transform,filter] duration-100 outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.15em]",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground [--relieve-color:var(--pasto-canto)] hover:brightness-110 ${RELIEVE}`,
        foco: `bg-foco text-accent-foreground [--relieve-color:var(--foco-canto)] hover:brightness-105 ${RELIEVE}`,
        dark: `bg-primary text-primary-foreground [--relieve-color:var(--pasto-canto)] hover:brightness-110 ${RELIEVE}`,
        destructive: `bg-destructive text-white [--relieve-color:var(--roja-canto)] hover:brightness-110 ${RELIEVE}`,
        outline: `border-2 border-border bg-card text-foreground hover:bg-secondary ${RELIEVE}`,
        secondary: `bg-secondary text-primary hover:brightness-97 ${RELIEVE}`,
        ghost: "hover:bg-secondary",
        onDark: `border-2 border-white/35 bg-white/10 text-white [--relieve-color:rgb(0_0_0/0.22)] hover:bg-white/20 ${RELIEVE}`,
        link: "rounded-none px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 rounded-2xl px-5 text-[15px]",
        sm: "h-9 rounded-xl px-3.5 text-sm",
        lg: "h-[52px] rounded-2xl px-7 text-[17px]",
        icon: "size-11 rounded-2xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
