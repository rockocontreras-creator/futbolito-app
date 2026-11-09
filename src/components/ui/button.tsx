import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform] outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/35 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        foco: "bg-foco text-[#2a2205] hover:bg-foco/90",
        dark: "bg-cancha text-white hover:bg-cancha-oscura",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-input bg-card hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-secondary",
        onDark: "border border-white/30 text-white hover:bg-white/10",
        link: "rounded-none px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-[13px]",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
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
