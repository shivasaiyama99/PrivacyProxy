"use client";

import React from "react";
import { motion } from "framer-motion";

interface GlowingPulseBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function GlowingPulseBadge({
  children,
  className = "",
}: GlowingPulseBadgeProps) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Radial glow pulse behind badge */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,255,136,0.25) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.6, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Badge content */}
      <div className="relative z-10 flex items-center gap-1.5 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/5 px-3 py-1.5 backdrop-blur-md">
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-[#00ff88]"
          animate={{
            scale: [1, 1.3, 1],
            boxShadow: [
              "0 0 0px rgba(0,255,136,0.4)",
              "0 0 8px rgba(0,255,136,0.8)",
              "0 0 0px rgba(0,255,136,0.4)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {children}
      </div>
    </div>
  );
}
