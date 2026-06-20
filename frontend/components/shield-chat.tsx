"use client";

import React from "react"

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Scan,
  AlertTriangle,
  Trash2,
  Shield,
  CheckCircle,
  Eye,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepIndicator } from "@/components/step-indicator";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { sanitizeText, auditText, chatProxy, type SanitizeMode, type AuditResult, type ChatResponse, type ToolCall } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGovernance } from "@/contexts/GovernanceContext";
import dynamic from "next/dynamic";

const Markdown = dynamic(() => import("markdown-to-jsx"), { ssr: false });

type AuditStatus = "idle" | "running" | "passed" | "failed" | "rate_limited";

// PII Detection patterns and types
interface PIIMatch {
  type: string;
  original: string;
  replacement: string;
  start: number;
  end: number;
}

// Fallback regex patterns for demo mode
const PII_PATTERNS: { type: string; regex: RegExp; replacement: string }[] = [
  {
    type: "CREDIT_CARD",
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: "[REDACTED_CC]",
  },
  {
    type: "SSN",
    regex: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
    replacement: "[REDACTED_SSN]",
  },
  {
    type: "EMAIL",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: "[REDACTED_EMAIL]",
  },
  {
    type: "PHONE",
    regex: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[REDACTED_PHONE]",
  },
  {
    type: "AWS_KEY",
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    replacement: "[REDACTED_AWS_KEY]",
  },
  {
    type: "API_KEY",
    regex: /\b(sk-[a-zA-Z0-9]{32,})\b/g,
    replacement: "[REDACTED_API_KEY]",
  },
  {
    type: "IP_ADDRESS",
    regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    replacement: "[REDACTED_IP]",
  },
];

// Fallback PII detection for demo mode
function detectPII(text: string): PIIMatch[] {
  const matches: PIIMatch[] = [];
  for (const pattern of PII_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        type: pattern.type,
        original: match[0],
        replacement: pattern.replacement,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

// Convert backend response to PIIMatch format for highlighting
function convertBackendResponseToMatches(
  originalText: string,
  cleanText: string,
  items: string[],
  syntheticMap?: Record<string, string>
): PIIMatch[] {
  const matches: PIIMatch[] = [];

  const normalizeEntityType = (entityType: string): string => {
    return entityType
      .replace("EMAIL_ADDRESS", "EMAIL")
      .replace("PHONE_NUMBER", "PHONE")
      .replace("US_SSN", "SSN")
      .replace("IP_ADDRESS", "IP")
      .replace("_ADDRESS", "")
      .replace("_NUMBER", "")
      .replace("US_", "");
  };

  const inferEntityType = (original: string): string => {
    if (original.includes("@")) return "EMAIL";
    if (original.match(/^\d{3}-?\d{2}-?\d{4}$/)) return "SSN";
    if (original.match(/^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/)) return "CREDIT_CARD";
    if (original.match(/^\+?[\d\s\-\(\)]{10,}$/)) return "PHONE";
    if (original.match(/^(sk-|ghp_|AKIA)/)) return "API_KEY";
    if (original.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) return "IP";
    return "PERSON";
  };

  if (syntheticMap && Object.keys(syntheticMap).length > 0) {
    const processedPositions = new Set<string>();

    for (const [original, replacement] of Object.entries(syntheticMap)) {
      let searchIndex = 0;

      while (searchIndex < cleanText.length) {
        const index = cleanText.indexOf(replacement, searchIndex);
        if (index === -1) break;

        const posKey = `${index}-${index + replacement.length}`;
        if (processedPositions.has(posKey)) {
          searchIndex = index + 1;
          continue;
        }

        let entityType = "PII";

        if (replacement.match(/^<[A-Z_]+>$/)) {
          entityType = normalizeEntityType(replacement.slice(1, -1));
        } else if (replacement.match(/^[A-Z_]+ \d+$/)) {
          const rawType = replacement.split(" ")[0];
          entityType = normalizeEntityType(rawType);
        } else {
          entityType = inferEntityType(original);
        }

        matches.push({
          type: entityType,
          original: original,
          replacement: replacement,
          start: index,
          end: index + replacement.length,
        });

        processedPositions.add(posKey);
        searchIndex = index + replacement.length;
      }
    }
  } else {
    const tagPattern = /<([A-Z_]+)>/g;
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(cleanText)) !== null) {
      const rawEntityType = match[1];
      const entityType = normalizeEntityType(rawEntityType);

      matches.push({
        type: entityType,
        original: `[${rawEntityType}]`,
        replacement: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  const uniqueMatches = matches
    .sort((a, b) => a.start - b.start)
    .filter((match, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      return match.start !== prev.start || match.end !== prev.end;
    });

  return uniqueMatches;
}

function RedactedText({
  text,
  matches,
  isScanning,
  isDemoMode = false,
}: {
  text: string;
  matches: PIIMatch[];
  isScanning: boolean;
  isDemoMode?: boolean;
}) {
  if (!text) {
    return (
      <span className="text-muted-foreground/40 font-mono text-sm italic">
        Sanitized output will appear here...
      </span>
    );
  }

  if (matches.length === 0) {
    return <span className="font-mono text-sm text-foreground">{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((m, i) => {
    if (m.start > lastIndex) {
      parts.push(
        <span key={`text-${i}`} className="font-mono text-sm text-foreground">
          {text.slice(lastIndex, m.start)}
        </span>
      );
    }
    parts.push(
      <motion.span
        key={`redacted-${i}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.1, duration: 0.3 }}
        className="inline-flex items-center gap-1 rounded-sm bg-destructive/20 border border-destructive/40 px-1.5 py-0.5 font-mono text-xs text-destructive glow-rose"
      >
        <ShieldAlert className="h-3 w-3" />
        {m.replacement}
      </motion.span>
    );
    lastIndex = m.end;
  });

  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end" className="font-mono text-sm text-foreground">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return (
    <div className="relative">
      {isScanning && (
        <motion.div
          initial={{ top: 0 }}
          animate={{ top: "100%" }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="pointer-events-none absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ boxShadow: "0 0 12px hsl(160 84% 39% / 0.6)" }}
        />
      )}
      <div className="leading-relaxed">{parts}</div>
    </div>
  );
}

const SAMPLE_PROMPTS = [
  "My name is John Doe, email: john.doe@acme.com and my SSN is 123-45-6789. Please process my payment with card 4532-1234-5678-9012.",
  "Deploy to server 192.168.1.100 using API key sk-abcdefghijklmnopqrstuvwxyz123456 and AWS key AKIAIOSFODNN7EXAMPLE.",
  "Contact Sarah at (555) 867-5309 or sarah.connor@skynet.io for the medical records.",
];

interface HistoryEntry {
  id: number;
  input: string;
  matches: PIIMatch[];
  timestamp: Date;
}

export function ShieldChat() {
  const { isDemoMode } = useDemoMode();
  const { config } = useGovernance();
  const [input, setInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [currentMatches, setCurrentMatches] = useState<PIIMatch[]>([]);
  const [sanitizedText, setSanitizedText] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeStep, setActiveStep] = useState("sanitize");
  const [apiError, setApiError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditStatus, setAuditStatus] = useState<AuditStatus>("idle");
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [sanitizeMode, setSanitizeMode] = useState<SanitizeMode>("synthetic");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [toolsCalled, setToolsCalled] = useState<ToolCall[]>([]);
  const [piiEntities, setPiiEntities] = useState<string[]>([]);
  const [responseMode, setResponseMode] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<"pii" | "audit" | "tools" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const steps = [
    { id: "sanitize", label: "Sanitize", icon: Shield },
    { id: "verify", label: "Verify", icon: CheckCircle },
    { id: "forward", label: "Forward", icon: Send },
  ];

  const handleSanitize = useCallback(async () => {
    if (!input.trim()) return;
    setActiveStep("sanitize");
    setIsScanning(true);
    setApiError(null);
    setAuditResult(null);
    setAuditStatus("idle");
    setProcessingTime(null);
    setToolsCalled([]);
    setPiiEntities([]);
    setResponseMode(null);
    setLoadingStage("pii");

    try {
      // 1. Sanitize (Immediate feedback)
      const sanitizeResponse = await sanitizeText(input, sanitizeMode, config.enabledEntities);

      setSanitizedText(sanitizeResponse.clean_text);
      setProcessingTime(sanitizeResponse.processing_time_ms);

      const matches = convertBackendResponseToMatches(
        input,
        sanitizeResponse.clean_text,
        sanitizeResponse.items,
        sanitizeResponse.synthetic_map
      );
      setCurrentMatches(matches);
      setIsScanning(false);
      setActiveStep("verify");

      setHistory((prev) => [
        {
          id: Date.now(),
          input,
          matches,
          timestamp: new Date(),
        },
        ...prev,
      ]);

      // 2. Combined Audit & Forward (The Hard Gate)
      setIsLoadingAI(true);
      setAiError(null);
      setAuditStatus("running");
      setLoadingStage("audit");

      try {
        const response = await chatProxy(input, sanitizeMode, config.enabledEntities);

        // Extract MCP fields
        if (response.tools_called && response.tools_called.length > 0) {
          setToolsCalled(response.tools_called);
        }
        if (response.pii_entities && response.pii_entities.length > 0) {
          setPiiEntities(response.pii_entities);
        }
        if (response.mode) {
          setResponseMode(response.mode);
        }

        // Update Audit Results from the gate
        if (response.audit_report) {
          setAuditResult(response.audit_report);
          setAuditStatus("passed");
        }

        setLoadingStage("tools");

        // Only "Forward" if we got a reply (Score >= 70)
        if (response.reply) {
          setAiResponse(response.reply);
          setActiveStep("forward"); // Task 3: Sync Forward Light
        }

        setIsLoadingAI(false);
        setLoadingStage(null);
      } catch (err: any) {
        console.error("Security Gate error:", err);

        // Handle 403 Blocked
        if (err.message?.includes("403")) {
          setAuditStatus("failed");
          try {
            // Extract audit report from error detail if possible
            const errorDetail = JSON.parse(err.message.split(": ")[1]);
            if (errorDetail.audit_report) {
              setAuditResult(errorDetail.audit_report);
            }
          } catch (e) { }
          setAiError("BLOCKED"); // Special state for Red Alert
        } else {
          setAiError(err instanceof Error ? err.message : "Security system failure");
          setAuditStatus("failed");
        }
        setIsLoadingAI(false);
        setLoadingStage(null);
      }
    } catch (error) {
      console.error("Sanitize API error:", error);
      setApiError(error instanceof Error ? error.message : "Backend unavailable");
      setAuditStatus("idle");
      setIsScanning(false);
    }
  }, [input, sanitizeMode, config.enabledEntities]);

  const handleSampleClick = (sample: string) => {
    setInput(sample);
    setSanitizedText("");
    setCurrentMatches([]);
    setActiveStep("sanitize");
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.trim()) {
      setActiveStep("sanitize");
    } else {
      setActiveStep("sanitize");
      setSanitizedText("");
      setCurrentMatches([]);
    }
  };

  const handleForward = () => {
    setActiveStep("forward");
    setAuditStatus("idle");
    setTimeout(() => {
      setInput("");
      setSanitizedText("");
      setCurrentMatches([]);
      setAuditResult(null);
      setApiError(null);
      setActiveStep("sanitize");
    }, 1000);
  };

  // Demo mode auto-fill
  React.useEffect(() => {
    if (isDemoMode && !input) {
      const demoText = "My name is John Doe, email: john.doe@acme.com and my SSN is 123-45-6789. Please process my payment with card 4532-1234-5678-9012.";
      setInput(demoText);
      setActiveStep("sanitize");

      // Auto-trigger sanitize after 1 second
      setTimeout(() => {
        handleSanitize();
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode]);

  // Update active step based on state
  React.useEffect(() => {
    if (currentMatches.length > 0 && !isScanning) {
      setActiveStep("verify");
    } else if (isScanning) {
      setActiveStep("sanitize");
    } else {
      setActiveStep("sanitize");
    }
  }, [input, currentMatches, isScanning]);

  const handleClear = () => {
    setInput("");
    setSanitizedText("");
    setCurrentMatches([]);
    setAuditResult(null);
    setAuditStatus("idle");
    setAiResponse("");
    setAiError(null);
    setToolsCalled([]);
    setPiiEntities([]);
    setResponseMode(null);
    setLoadingStage(null);
  };

  const threatCount = currentMatches.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Privacy Shield</h2>
          <p className="text-sm text-muted-foreground">
            Real-time PII detection and sanitization engine
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px] uppercase tracking-wider",
              threatCount > 0
                ? "border-destructive/40 text-destructive"
                : "border-primary/40 text-primary"
            )}
          >
            {threatCount > 0 ? `${threatCount} PII DETECTED` : "CLEAN SIGNAL"}
          </Badge>
        </div>
      </div>

      {/* API Error Banner */}
      {apiError && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-[11px] font-mono text-yellow-500">
            {apiError}
          </AlertDescription>
        </Alert>
      )}

      {/* Step Indicator: gray out Verify/Forward when audit failed or rate-limited */}
      <StepIndicator
        steps={steps}
        activeStep={activeStep}
        unavailableSteps={
          auditStatus === "failed" || auditStatus === "rate_limited"
            ? ["verify", "forward"]
            : []
        }
      />

      {/* Mode Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Mode:
        </span>
        <div className="flex gap-1">
          {(["strict", "synthetic", "mask"] as SanitizeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSanitizeMode(mode)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[10px] font-mono uppercase transition-colors",
                sanitizeMode === mode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Sample Prompts */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground self-center mr-1">
          Test vectors:
        </span>
        {SAMPLE_PROMPTS.map((sample, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSampleClick(sample)}
            className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors truncate max-w-[200px]"
          >
            Vector #{i + 1}
          </button>
        ))}
      </div>

      {/* Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Untrusted Input */}
        <div className="flex flex-col rounded-lg border border-destructive/20 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-destructive/20 bg-destructive/5 px-4 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-destructive">
                USER_PROMPT_UNTRUSTED
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive/60" />
              <span className="text-[10px] font-mono text-destructive/60">RAW</span>
            </div>
          </div>
          <div className="relative flex-1 p-4">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                handleInputChange(e.target.value);
                setSanitizedText("");
                setCurrentMatches([]);
              }}
              placeholder="Paste untrusted prompt content here... (includes PII, API keys, credentials)"
              className="h-48 w-full resize-none bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              {input.length} chars
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 px-2 text-[10px] font-mono text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                CLEAR
              </Button>
              <Button
                size="sm"
                onClick={handleSanitize}
                disabled={!input.trim() || isScanning}
                className="h-7 gap-1.5 bg-primary px-3 text-[10px] font-mono uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <Scan className="h-3 w-3 animate-spin" />
                    SCANNING
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3" />
                    SANITIZE & FORWARD
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Sanitized Output */}
        <div className="flex flex-col rounded-lg border border-primary/20 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-primary/20 bg-primary/5 px-4 py-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
                SANITIZED_OUTPUT
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-primary/60">PROTECTED</span>
            </div>
          </div>
          <div className="relative flex-1 p-4 min-h-[192px]">
            <AnimatePresence mode="wait">
              {isScanning && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative h-12 w-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
                      />
                      <Eye className="absolute inset-0 m-auto h-5 w-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary animate-pulse">
                      Analyzing threat vectors...
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!isScanning && (
              <RedactedText
                text={sanitizedText}
                matches={currentMatches}
                isScanning={false}
                isDemoMode={isDemoMode}
              />
            )}
          </div>
          {/* Threat Summary & Audit Results */}
          {currentMatches.length > 0 && !isScanning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="border-t border-primary/20 bg-primary/5 px-4 py-2 space-y-2"
            >
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  const typeCounts = new Map<string, number>();
                  currentMatches.forEach((m) => {
                    typeCounts.set(m.type, (typeCounts.get(m.type) || 0) + 1);
                  });

                  return Array.from(typeCounts.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([type, count]) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className="border-destructive/30 bg-destructive/10 text-[10px] font-mono text-destructive"
                      >
                        {type} x{count}
                      </Badge>
                    ));
                })()}
              </div>

              {/* Processing Time */}
              {processingTime !== null && (
                <div className="text-[10px] font-mono text-muted-foreground">
                  Processing: {processingTime.toFixed(2)}ms
                </div>
              )}

              {/* Audit status: running / passed / temporarily unavailable */}
              {auditStatus === "running" && !auditResult && (
                <div className="text-[10px] font-mono text-primary animate-pulse">
                  Running security audit...
                </div>
              )}
              {(auditStatus === "failed" || auditStatus === "rate_limited") && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/50 bg-yellow-500/10 text-[10px] font-mono text-yellow-500"
                >
                  Audit temporarily unavailable
                </Badge>
              )}
              {auditResult && (
                <div className={cn(
                  "rounded-md border p-2 text-[10px] font-mono",
                  auditResult.safety_score > 90
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : auditResult.safety_score > 70
                      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Safety: {auditResult.safety_score}/100</span>
                    <span>Usability: {auditResult.usability_score}/100</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    {auditResult.critique}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* AI Response Panel */}
      {(aiResponse || isLoadingAI || aiError) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-primary/30 bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-primary/20 bg-primary/5 px-4 py-2">
            <div className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
                EXTERNAL_AI_RESPONSE
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isLoadingAI ? "bg-yellow-500 animate-pulse" : "bg-primary"
                )}
              />
              <span className="text-[10px] font-mono text-primary/60">
                {isLoadingAI ? "PROCESSING" : "COMPLETE"}
              </span>
            </div>
          </div>

          <div className="p-4 min-h-[120px]">
            {isLoadingAI && (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative h-10 w-10">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
                    />
                    <Send className="absolute inset-0 m-auto h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary animate-pulse">
                      {loadingStage === "pii" && "Scanning for PII..."}
                      {loadingStage === "audit" && "Running security audit..."}
                      {loadingStage === "tools" && "AI querying MCP tools..."}
                      {!loadingStage && "AI processing sanitized data..."}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      {(["pii", "audit", "tools"] as const).map((stage) => (
                        <div
                          key={stage}
                          className={cn(
                            "h-1 w-6 rounded-full transition-colors duration-300",
                            loadingStage === stage
                              ? "bg-primary animate-pulse"
                              : (loadingStage === "audit" && stage === "pii") ||
                                (loadingStage === "tools" && (stage === "pii" || stage === "audit"))
                                ? "bg-primary/60"
                                : "bg-primary/20"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {aiError === "BLOCKED" && auditResult && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 backdrop-blur-md">
                <ShieldAlert className="h-5 w-5" />
                <AlertTitle className="font-mono uppercase tracking-tighter">Access Denied: Security Policy Violation</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="font-mono text-xs opacity-90">
                    Your request was blocked by the CISO Security Gate (Score: {auditResult.safety_score}/100)
                  </p>
                  <div className="rounded border border-destructive/30 bg-destructive/20 p-2 font-mono text-[10px] italic text-destructive">
                    "{auditResult.critique}"
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {aiError && aiError !== "BLOCKED" && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-[11px] font-mono text-yellow-500">
                  AI Response Error: {aiError}
                </AlertDescription>
              </Alert>
            )}

            {aiResponse && !isLoadingAI && (
              <div className="space-y-4">
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 backdrop-blur-sm">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-primary/60 mb-2">
                    AI Received (Sanitized):
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{sanitizedText}</div>
                </div>

                {/* MCP Tools Called Badges */}
                {toolsCalled.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 backdrop-blur-sm"
                  >
                    <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400/80 mb-2 flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      MCP TOOLS INVOKED ({toolsCalled.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {toolsCalled.map((tc, i) => {
                        const toolColors: Record<string, string> = {
                          scan_pii: "border-rose-500/40 bg-rose-500/10 text-rose-400",
                          get_vault_files: "border-violet-500/40 bg-violet-500/10 text-violet-400",
                          get_audit_logs: "border-amber-500/40 bg-amber-500/10 text-amber-400",
                          trigger_killswitch: "border-red-600/40 bg-red-600/10 text-red-400",
                          get_dashboard_stats: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
                          get_pii_distribution: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                        };
                        const colorClass = toolColors[tc.tool] || "border-primary/40 bg-primary/10 text-primary";
                        return (
                          <Badge
                            key={`${tc.tool}-${i}`}
                            variant="outline"
                            className={cn("text-[10px] font-mono", colorClass)}
                          >
                            {tc.tool}
                          </Badge>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* PII Entities Detected by Backend */}
                {piiEntities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-md border border-orange-500/20 bg-orange-500/5 p-3 backdrop-blur-sm"
                  >
                    <div className="text-[10px] font-mono uppercase tracking-wider text-orange-400/80 mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="h-3 w-3" />
                      PII ENTITIES REDACTED
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {piiEntities.map((entity, i) => (
                        <Badge
                          key={`${entity}-${i}`}
                          variant="outline"
                          className="border-orange-500/30 bg-orange-500/10 text-[10px] font-mono text-orange-400"
                        >
                          {entity}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Mode Badge */}
                {responseMode && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                      Redaction Mode:
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-mono",
                        responseMode === "strict"
                          ? "border-red-500/40 bg-red-500/10 text-red-400"
                          : responseMode === "synthetic"
                            ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                            : "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                      )}
                    >
                      {responseMode.toUpperCase()}
                    </Badge>
                  </div>
                )}

                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                  <div className="relative rounded-lg border border-primary/30 bg-black/40 backdrop-blur-xl p-4 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-primary flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        AI RESPONSE
                      </div>
                      <Badge variant="outline" className="border-primary/40 text-[9px] font-mono text-primary flex gap-1 items-center px-1.5 py-0">
                        <Shield className="h-2.5 w-2.5" /> SHIELDED
                      </Badge>
                    </div>

                    <div className="prose prose-invert prose-sm max-w-none font-sans text-foreground/90 leading-relaxed 
                      prose-code:font-mono prose-code:bg-primary/10 prose-code:text-primary prose-code:px-1 prose-code:rounded
                      prose-pre:bg-black/50 prose-pre:border prose-pre:border-primary/20 prose-pre:p-4 prose-pre:rounded-lg">
                      <Markdown>{aiResponse}</Markdown>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/60 italic ml-1">
                  <ShieldCheck className="h-3 w-3 text-primary/60" />
                  <span>Secure forwarding verified. No real-world PII was transmitted.</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Agent Status Orbs */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          { name: "Sanitize", status: "Ready", color: "primary" },
          { name: "Verify", status: "Monitoring", color: "primary" },
          { name: "Forward", status: "Queued", color: "primary" },
        ].map((agent) => (
          <div
            key={agent.name}
            className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-mono text-muted-foreground">
              Agent: <span className="text-foreground">{agent.name}</span>
            </span>
            <span className="text-[10px] font-mono text-primary">{agent.status}</span>
          </div>
        ))}
      </div>

      {/* Scan History */}
      {history.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-secondary/30 px-4 py-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Scan History ({history.length})
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-cyber divide-y divide-border">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 px-4 py-2.5">
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                <span className="text-xs font-mono text-foreground truncate flex-1">
                  {entry.input.slice(0, 60)}...
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-[10px] font-mono",
                    entry.matches.length > 0
                      ? "border-destructive/30 text-destructive"
                      : "border-primary/30 text-primary"
                  )}
                >
                  {entry.matches.length} threats
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
