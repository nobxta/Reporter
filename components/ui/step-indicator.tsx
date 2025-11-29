"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({
  steps,
  currentStep,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;

        return (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "relative w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300",
                  isCompleted &&
                    "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg",
                  isCurrent &&
                    "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg ring-4 ring-red-500/30",
                  isUpcoming &&
                    "bg-[#141414] text-gray-500 border-2 border-gray-800"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </motion.div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[80px]",
                  isCurrent && "text-red-500 font-semibold",
                  isCompleted && "text-gray-400",
                  isUpcoming && "text-gray-500"
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-all duration-300",
                  isCompleted
                    ? "bg-gradient-to-r from-red-600 to-red-500"
                    : "bg-gray-800"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

