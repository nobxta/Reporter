import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  children: ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const spacingClasses = {
  sm: "py-12 sm:py-16",
  md: "py-16 sm:py-24",
  lg: "py-24 sm:py-32",
  xl: "py-32 sm:py-40",
  "2xl": "py-40 sm:py-48",
};

export default function PageSection({
  children,
  className,
  spacing = "lg",
}: PageSectionProps) {
  return (
    <section className={cn(spacingClasses[spacing], className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

