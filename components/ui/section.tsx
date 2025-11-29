import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const spacingClasses = {
  sm: "py-8 sm:py-12",
  md: "py-12 sm:py-16",
  lg: "py-16 sm:py-24",
  xl: "py-24 sm:py-32",
  "2xl": "py-32 sm:py-48",
};

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing = "lg", ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(spacingClasses[spacing], className)}
        {...props}
      />
    );
  }
);
Section.displayName = "Section";

export { Section };

