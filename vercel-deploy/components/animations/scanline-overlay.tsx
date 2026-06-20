"use client";

import React from "react";
import { motion } from "framer-motion";

export function ScanlineOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {/* Subtle grid pattern — terminal/hacker look */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 136, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 136, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Moving horizontal scanline */}
      <motion.div
        className="absolute left-0 right-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.15) 20%, rgba(0,255,136,0.25) 50%, rgba(0,212,255,0.15) 80%, transparent 100%)",
          boxShadow: "0 0 20px rgba(0,255,136,0.15), 0 0 60px rgba(0,212,255,0.08)",
        }}
        animate={{
          top: ["-2%", "102%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Faint CRT vignette edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </div>
  );
}
