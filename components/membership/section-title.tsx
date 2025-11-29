import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "text-2xl sm:text-3xl",
  md: "text-3xl sm:text-4xl md:text-5xl",
  lg: "text-4xl sm:text-5xl md:text-6xl",
  xl: "text-5xl sm:text-6xl md:text-7xl",
};

export default function SectionTitle({
  children,
  className,
  as: Component = "h2",
  size = "md",
}: SectionTitleProps) {
  return (
    <Component
      className={cn(
        "font-bold uppercase tracking-tight text-center text-white",
        sizeClasses[size],
        className
      )}
    >
      {children}
    </Component>
  );
}

