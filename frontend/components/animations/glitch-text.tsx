"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, useAnimationControls } from "framer-motion";

interface GlitchTextProps {
  text: string;
  className?: string;
}

export function GlitchText({ text, className = "" }: GlitchTextProps) {
  const controls = useAnimationControls();
  const [isGlitching, setIsGlitching] = useState(false);

  const triggerGlitch = useCallback(async () => {
    setIsGlitching(true);
    await controls.start({
      x: [0, -2, 3, -1, 2, 0],
      opacity: [1, 0.8, 1, 0.7, 1, 1],
      transition: { duration: 0.3, ease: "easeInOut" },
    });
    setIsGlitching(false);
  }, [controls]);

  useEffect(() => {
    const scheduleNext = () => {
      const delay = Math.random() * 4000 + 2000; // 2-6s random interval
      return setTimeout(() => {
        triggerGlitch();
        timerRef = scheduleNext();
      }, delay);
    };
    let timerRef = scheduleNext();
    return () => clearTimeout(timerRef);
  }, [triggerGlitch]);

  return (
    <motion.span
      animate={controls}
      className={`relative inline-block ${className}`}
    >
      {/* Main text */}
      <span className="relative z-10">{text}</span>

      {/* Red offset clone (chromatic aberration) */}
      <span
        aria-hidden
        className="absolute inset-0 z-0 select-none"
        style={{
          color: "#ff0040",
          clipPath: isGlitching
            ? "polygon(0 15%, 100% 15%, 100% 40%, 0 40%)"
            : "polygon(0 0, 0 0, 0 0, 0 0)",
          transform: "translate(-2px, -1px)",
          opacity: isGlitching ? 0.7 : 0,
          transition: "opacity 0.05s",
        }}
      >
        {text}
      </span>

      {/* Cyan offset clone (chromatic aberration) */}
      <span
        aria-hidden
        className="absolute inset-0 z-0 select-none"
        style={{
          color: "#00d4ff",
          clipPath: isGlitching
            ? "polygon(0 60%, 100% 60%, 100% 85%, 0 85%)"
            : "polygon(0 0, 0 0, 0 0, 0 0)",
          transform: "translate(2px, 1px)",
          opacity: isGlitching ? 0.7 : 0,
          transition: "opacity 0.05s",
        }}
      >
        {text}
      </span>
    </motion.span>
  );
}
