"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RedactionInfo {
  type: string;
  confidence: number;
  standard: string;
  method: string;
}

const REDACTION_INFO: Record<string, RedactionInfo> = {
  CREDIT_CARD: {
    type: "Credit Card",
    confidence: 99.2,
    standard: "PCI-DSS",
    method: "Replaced with synthetic data"
  },
  SSN: {
    type: "Social Security Number",
    confidence: 98.7,
    standard: "GDPR / HIPAA",
    method: "Cryptographic hashing"
  },
  EMAIL: {
    type: "Email Address",
    confidence: 97.8,
    standard: "GDPR",
    method: "Domain masking"
  },
  PHONE: {
    type: "Phone Number",
    confidence: 96.5,
    standard: "GDPR",
    method: "Partial redaction"
  },
  AWS_KEY: {
    type: "AWS Access Key",
    confidence: 99.9,
    standard: "SOC 2",
    method: "Full replacement"
  },
  API_KEY: {
    type: "API Key",
    confidence: 99.8,
    standard: "ISO 27001",
    method: "Token replacement"
  },
  IP_ADDRESS: {
    type: "IP Address",
    confidence: 95.2,
    standard: "GDPR",
    method: "Network masking"
  }
};

interface EnhancedRedactionTooltipProps {
  children: React.ReactNode;
  piiType: string;
  original: string;
  replacement: string;
  isDemoMode?: boolean;
}

export function EnhancedRedactionTooltip({
  children,
  piiType,
  original,
  replacement,
  isDemoMode = false
}: EnhancedRedactionTooltipProps) {
  const info = REDACTION_INFO[piiType] || {
    type: piiType,
    confidence: 95.0,
    standard: "GDPR",
    method: "Standard redaction"
  };

  const tooltipContent = (
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="font-semibold text-xs">{info.type}</span>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Standard:</span>
          <span className="font-mono text-primary">{info.standard}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Confidence:</span>
          <span className={cn(
            "font-mono",
            info.confidence >= 99 ? "text-primary" : 
            info.confidence >= 95 ? "text-yellow-500" : "text-destructive"
          )}>
            {info.confidence}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Method:</span>
          <span className="text-right text-muted-foreground">{info.method}</span>
        </div>
      </div>
      <div className="border-t border-border pt-2">
        <div className="text-[9px] font-mono text-muted-foreground">
          Original: {original}
        </div>
      </div>
    </div>
  );

  if (isDemoMode) {
    return (
      <TooltipProvider>
        <Tooltip open={true} defaultOpen={true}>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="w-64">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="w-64">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
