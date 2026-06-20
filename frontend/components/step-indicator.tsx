"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface StepIndicatorProps {
  steps: Step[];
  activeStep: string;
  /** Step ids to show as unavailable (e.g. when audit failed) */
  unavailableSteps?: string[];
}

export function StepIndicator({ steps, activeStep, unavailableSteps = [] }: StepIndicatorProps) {
  const activeIndex = steps.findIndex(step => step.id === activeStep);

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {steps.map((step, index) => {
        const isActive = step.id === activeStep;
        const isCompleted = index < activeIndex;
        const isUnavailable = unavailableSteps.includes(step.id);

        return (
          <React.Fragment key={step.id}>
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isUnavailable && "opacity-50 border-muted-foreground/30 bg-muted/50",
                  !isUnavailable && isActive
                    ? "border-primary bg-primary text-primary-foreground glow-emerald"
                    : !isUnavailable && isCompleted
                    ? "border-primary bg-primary/20 text-primary"
                    : !isUnavailable && "border-border bg-muted text-muted-foreground"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <step.icon className="h-4 w-4" />
              </motion.div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isUnavailable && "text-muted-foreground/50",
                  !isUnavailable && isActive ? "text-primary" : !isUnavailable && isCompleted ? "text-muted-foreground" : !isUnavailable && "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </motion.div>

            {index < steps.length - 1 && (
              <motion.div
                className={cn(
                  "h-0.5 w-8 transition-colors duration-300",
                  index < activeIndex ? "bg-primary" : "bg-border"
                )}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: index < activeIndex ? 1 : 0.3 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
