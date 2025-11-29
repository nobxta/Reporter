"use client";

import { ReactNode } from "react";

interface DarkLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function DarkLayout({ children, className = "" }: DarkLayoutProps) {
  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden ${className}`}>
      {/* Subtle Grid Background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Red Gradient at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-red-600/20 via-red-500/10 to-transparent pointer-events-none z-0" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

