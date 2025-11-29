"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import PrimaryButton from "./primary-button";

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  features: string[];
  ctaText: string;
  isPrimary?: boolean;
  onCtaClick?: () => void;
  className?: string;
}

export default function PricingCard({
  title,
  price,
  period,
  features,
  ctaText,
  isPrimary = false,
  onCtaClick,
  className,
}: PricingCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative rounded-xl p-8 transition-all duration-300",
        isPrimary
          ? "bg-[#141414] border-2 border-red-500/50 shadow-[0_18px_45px_rgba(239,68,68,0.15)]"
          : "bg-[#141414] border border-gray-800/50 hover:border-gray-700/50",
        "shadow-[0_18px_45px_rgba(0,0,0,0.7)]",
        className
      )}
    >
      {isPrimary && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-4">
          {title}
        </h3>
        <div className="mb-2">
          <span className="text-5xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">{price}</span>
          {period && (
            <span className="text-gray-400 text-lg ml-2">{period}</span>
          )}
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <PrimaryButton
        onClick={onCtaClick}
        className="w-full"
        variant={isPrimary ? "default" : "outline"}
      >
        {ctaText}
      </PrimaryButton>
    </motion.div>
  );
}

