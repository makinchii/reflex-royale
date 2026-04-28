import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
  {
    variants: {
      variant: {
        default: "border-cyan-400/50 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/20",
        secondary: "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
        ghost: "border-transparent bg-transparent text-slate-300 hover:bg-white/5 hover:text-white",
        outline: "border-white/15 bg-transparent text-slate-100 hover:bg-white/5"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
