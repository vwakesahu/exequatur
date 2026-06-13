import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const headingVariants = cva("tracking-tight bg-clip-text text-transparent", {
  variants: {
    variant: {
      default: "bg-gradient-to-t from-neutral-700 to-neutral-900 dark:from-stone-200 dark:to-neutral-200",
      indigo: "bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-300 dark:to-indigo-500",
    },
    size: {
      xs: "text-lg sm:text-xl lg:text-2xl",
      sm: "text-xl sm:text-2xl lg:text-3xl",
      md: "text-2xl sm:text-3xl lg:text-4xl",
      lg: "text-3xl sm:text-4xl lg:text-5xl",
      xl: "text-4xl sm:text-5xl lg:text-6xl",
    },
    weight: {
      base: "font-medium",
      semi: "font-semibold",
      bold: "font-bold",
    },
  },
  defaultVariants: { variant: "default", size: "md", weight: "bold" },
});

export interface GradientHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  asChild?: boolean;
}

const GradientHeading = React.forwardRef<HTMLHeadingElement, GradientHeadingProps>(
  ({ asChild, variant, weight, size, className, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "h3";
    return (
      <Comp ref={ref} className={cn("font-display", className)} {...props}>
        <span className={cn(headingVariants({ variant, size, weight }))}>{children}</span>
      </Comp>
    );
  },
);
GradientHeading.displayName = "GradientHeading";

export { GradientHeading, headingVariants };
