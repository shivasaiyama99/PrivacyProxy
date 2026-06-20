"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * FloatingShield3D — A perspective-tilting SVG shield that:
 * - Auto-rotates Y from -15° to 15° in a 6s yoyo loop
 * - Tracks mouse position for interactive tilt (max ±20°)
 * - Glowing green border + inner gradient
 * - Rendered at 0.15 opacity behind hero text
 */
export function FloatingShield3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse-driven motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring follow for tilt
  const springConfig = { stiffness: 80, damping: 20, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [20, -20]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-20, 20]), springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Normalize to -1..1
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute inset-0 z-[3] flex items-center justify-center"
      style={{ perspective: "1200px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="pointer-events-none"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        // Auto-rotation on Y axis (yoyo -15° to 15°)
        animate={{ rotateY: ["-15deg", "15deg"] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      >
        <svg
          viewBox="0 0 400 480"
          className="h-[320px] w-[266px] md:h-[480px] md:w-[400px] opacity-[0.15]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Inner gradient fill */}
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#00ff88" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="shieldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Shield path */}
          <path
            d="M200 20 L370 100 L370 260 Q370 380 200 460 Q30 380 30 260 L30 100 Z"
            fill="url(#shieldGrad)"
            stroke="#00ff88"
            strokeWidth="1.5"
            filter="url(#shieldGlow)"
          />
          {/* Inner detail — keyhole / lock mark */}
          <circle cx="200" cy="210" r="30" stroke="#00ff88" strokeWidth="1" fill="none" opacity="0.3" />
          <rect x="192" y="235" width="16" height="40" rx="4" fill="#00ff88" opacity="0.15" />
        </svg>
      </motion.div>
    </div>
  );
}
