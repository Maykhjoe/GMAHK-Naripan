import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      primary: "bg-gold text-primary hover:-translate-y-0.5 hover:bg-[#d4b778] shadow-[0_8px_24px_rgba(200,169,107,.25)]",
      secondary: "border border-primary/15 bg-white text-primary hover:border-gold hover:bg-cream",
      ghost: "text-current hover:bg-white/10",
      dark: "bg-primary text-white hover:-translate-y-0.5 hover:bg-secondary",
      outlineLight: "border border-white/40 text-white hover:bg-white hover:text-primary",
    },
    size: { default: "h-11", lg: "h-13 px-7 text-[15px]", icon: "size-11 p-0" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
export { buttonVariants };
