"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export default function PrimaryButton({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: PrimaryButtonProps) {
  const sizeClasses = {
    sm: "px-6 py-3 text-xs",
    md: "px-8 py-4 text-sm",
    lg: "px-10 py-5 text-base",
  };

  const baseClasses =
    "rounded-xl font-semibold tracking-wide transition-all duration-300";
  
  const variantClasses = {
    default:
      "bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]",
    outline:
      "border border-gray-700 text-white bg-transparent hover:bg-gray-800 hover:border-gray-600",
    ghost:
      "text-white hover:bg-gray-800",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

