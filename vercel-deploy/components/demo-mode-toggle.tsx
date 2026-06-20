"use client";

import React from "react";
import { motion } from "framer-motion";
import { Power } from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { cn } from "@/lib/utils";

export function DemoModeToggle() {
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  return (
    <motion.button
      onClick={toggleDemoMode}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono transition-all duration-300",
        isDemoMode
          ? "border-primary/30 bg-primary/10 text-primary glow-emerald"
          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ rotate: isDemoMode ? 360 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <Power className="h-3 w-3" />
      </motion.div>
      <span className="uppercase tracking-wider">
        Demo Mode: {isDemoMode ? "ON 🟢 Guided" : "OFF ⚪ Manual"}
      </span>
    </motion.button>
  );
}
