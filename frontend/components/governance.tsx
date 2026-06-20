"use client";

import React from "react"

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  CreditCard,
  Heart,
  User,
  Mail,
  Phone,
  Key,
  Globe,
  FileText,
  Hash,
  Shuffle,
  Lock,
  ChevronDown,
  Save,
  RotateCcw,
  Info,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { useGovernance, type PresidioEntityType, type MaskingStrategy as GovernanceMaskingStrategy } from "@/contexts/GovernanceContext";

interface DetectionRule {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  category: string;
  enabled: boolean;
  severity: "critical" | "high" | "medium" | "low";
}

const INITIAL_RULES: DetectionRule[] = [
  {
    id: "financial",
    icon: CreditCard,
    label: "Detect Financial Identifiers",
    description: "Credit cards, bank accounts, routing numbers",
    category: "PCI-DSS",
    enabled: true,
    severity: "critical",
  },
  {
    id: "medical",
    icon: Heart,
    label: "Mask Medical Records",
    description: "Patient IDs, diagnosis codes, prescriptions",
    category: "HIPAA",
    enabled: true,
    severity: "critical",
  },
  {
    id: "names",
    icon: User,
    label: "Anonymize User Names",
    description: "Full names, usernames, display names",
    category: "GDPR",
    enabled: false,
    severity: "medium",
  },
  {
    id: "emails",
    icon: Mail,
    label: "Redact Email Addresses",
    description: "Personal and corporate email addresses",
    category: "GDPR",
    enabled: true,
    severity: "high",
  },
  {
    id: "phone",
    icon: Phone,
    label: "Mask Phone Numbers",
    description: "Mobile, landline, international formats",
    category: "GDPR",
    enabled: true,
    severity: "high",
  },
  {
    id: "credentials",
    icon: Key,
    label: "Intercept API Keys & Secrets",
    description: "AWS keys, API tokens, private keys",
    category: "SecOps",
    enabled: true,
    severity: "critical",
  },
  {
    id: "ip",
    icon: Globe,
    label: "Redact IP Addresses",
    description: "IPv4, IPv6, internal network ranges",
    category: "SecOps",
    enabled: true,
    severity: "medium",
  },
  {
    id: "ssn",
    icon: FileText,
    label: "Detect Social Security Numbers",
    description: "SSN patterns and national IDs",
    category: "PII",
    enabled: true,
    severity: "critical",
  },
];

type MaskingStrategy = "static" | "synthetic" | "hash";

const RULE_TO_ENTITIES: Record<string, PresidioEntityType[]> = {
  financial: ["CREDIT_CARD"],
  medical: ["PERSON"],
  names: ["PERSON"],
  emails: ["EMAIL_ADDRESS"],
  phone: ["PHONE_NUMBER"],
  credentials: ["API_KEY"],
  ip: ["IP_ADDRESS"],
  ssn: ["US_SSN"],
};

// Map frontend masking strategy to backend sanitize mode
function mapStrategyToBackendMode(strategy: MaskingStrategy): "strict" | "synthetic" | "mask" {
  switch (strategy) {
    case "static":
      return "strict";
    case "synthetic":
      return "synthetic";
    case "hash":
      return "mask";
    default:
      return "synthetic";
  }
}

const MASKING_STRATEGIES: {
  id: MaskingStrategy;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  example: string;
}[] = [
  {
    id: "static",
    label: "Static Replacement",
    description: "Replace with [REDACTED] tokens",
    icon: Shield,
    example: '"John Doe" -> "[REDACTED_NAME]"',
  },
  {
    id: "synthetic",
    label: "Synthetic Data",
    description: "Replace with realistic fake data for AI utility",
    icon: Shuffle,
    example: '"John Doe" -> "Alex Reed"',
  },
  {
    id: "hash",
    label: " Mask ",
    description: "Deterministic token placeholders",
    icon: Hash,
    example: '"John Doe" -> "Person 1"',
  },
];

const SEVERITY_WEIGHTS = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 5,
};

const SEVERITY_CONFIG = {
  critical: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
  high: { color: "text-neon-amber", bg: "bg-neon-amber/10", border: "border-neon-amber/30" },
  medium: { color: "text-neon-cyan", bg: "bg-neon-cyan/10", border: "border-neon-cyan/30" },
  low: { color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border" },
};

export function Governance() {
  const { config, setConfig } = useGovernance();
  const [rules, setRules] = useState(INITIAL_RULES);
  const [maskingStrategy, setMaskingStrategy] = useState<MaskingStrategy>("static");
  const [saved, setSaved] = useState(false);
  const [retentionDays, setRetentionDays] = useState("30");
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date(0)); // Epoch on SSR; real time set after hydration
  const [timeMounted, setTimeMounted] = useState(false);
  const { isDemoMode } = useDemoMode();

  // Render time only after hydration to avoid server/client time mismatch
  useEffect(() => {
    setTimeMounted(true);
    setLastUpdated((prev) => (prev.getTime() === 0 ? new Date() : prev));
  }, []);

  useEffect(() => {
    if (!config) return;

    // Hydrate UI toggles from persisted config (if present)
    if (config.rulesEnabled) {
      setRules((prev) =>
        prev.map((r) =>
          typeof config.rulesEnabled?.[r.id] === "boolean" ? { ...r, enabled: !!config.rulesEnabled[r.id] } : r
        )
      );
    }

    if (config.maskingStrategy) {
      setMaskingStrategy(config.maskingStrategy as GovernanceMaskingStrategy);
    }
  }, [config]);

  const deriveEnabledEntities = (nextRules: DetectionRule[]) => {
    const set = new Set<PresidioEntityType>();
    for (const rule of nextRules) {
      if (!rule.enabled) continue;
      const ents = RULE_TO_ENTITIES[rule.id];
      if (!ents) continue;
      ents.forEach((e) => set.add(e));
    }
    return Array.from(set);
  };

  // Calculate risk score
  const calculateRisk = () => {
    const disabledRules = rules.filter(rule => !rule.enabled);
    const totalRisk = disabledRules.reduce((sum, rule) => {
      return sum + SEVERITY_WEIGHTS[rule.severity];
    }, 0);
    return totalRisk;
  };

  const riskScore = calculateRisk();
  const getRiskLevel = () => {
    if (riskScore <= 20) return { level: "LOW", color: "text-primary" };
    if (riskScore <= 50) return { level: "MEDIUM", color: "text-yellow-500" };
    return { level: "HIGH", color: "text-destructive" };
  };

  const riskLevel = getRiskLevel();
  const activeCount = rules.filter((r) => r.enabled).length;

  const toggleRule = (id: string) => {
    const next = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(next);

    const rulesEnabled: Record<string, boolean> = {};
    next.forEach((r) => {
      rulesEnabled[r.id] = r.enabled;
    });

    setConfig({
      enabledEntities: deriveEnabledEntities(next),
      rulesEnabled,
      maskingStrategy,
    });
    setSaved(false);
    setLastUpdated(new Date());
  };

  const handleSave = () => {
    const rulesEnabled: Record<string, boolean> = {};
    rules.forEach((r) => {
      rulesEnabled[r.id] = r.enabled;
    });
    setConfig({
      enabledEntities: deriveEnabledEntities(rules),
      rulesEnabled,
      maskingStrategy,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setRules(INITIAL_RULES);
    setMaskingStrategy("static");
    setRetentionDays("30");
    setSaved(false);
    setLastUpdated(new Date());

    const rulesEnabled: Record<string, boolean> = {};
    INITIAL_RULES.forEach((r) => {
      rulesEnabled[r.id] = r.enabled;
    });
    setConfig({
      enabledEntities: deriveEnabledEntities(INITIAL_RULES),
      rulesEnabled,
      maskingStrategy: "static",
    });
  };

  const categories = Array.from(new Set(rules.map((r) => r.category)));

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Governance & Rules</h2>
            <p className="text-sm text-muted-foreground">
              Configure detection policies, masking strategies, and compliance rules
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 gap-1.5 text-[10px] font-mono uppercase tracking-wider bg-transparent"
            >
              <RotateCcw className="h-3 w-3" />
              RESET
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 gap-1.5 bg-primary px-4 text-[10px] font-mono uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3 w-3" />
              {saved ? "SAVED" : "DEPLOY CONFIG"}
            </Button>
          </div>
        </div>

        {/* Risk Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Active Protections</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {activeCount} of {rules.length} enabled
            </div>
          </div>
          
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Risk Level</span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${riskLevel.color}`}>
              {riskLevel.level}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Risk Score: {riskScore}
            </div>
          </div>
          
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Last Updated</span>
            </div>
            <div className="mt-2 text-sm font-mono text-foreground">
              {timeMounted ? lastUpdated.toLocaleTimeString() : "—"}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[10px] font-mono text-muted-foreground">
              Active Rules: <span className="text-foreground">{activeCount}/{rules.length}</span>
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              Strategy: <span className="text-primary uppercase">{maskingStrategy}</span>
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              Categories:{" "}
              {categories.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="mx-0.5 text-[9px] font-mono border-primary/20 text-primary/80"
                >
                  {c}
                </Badge>
              ))}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Detection Rules */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Detection Rules</h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {activeCount} of {rules.length} active
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {rules.map((rule, index) => {
                const severity = SEVERITY_CONFIG[rule.severity];
                return (
                <Tooltip key={rule.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        borderColor: !rule.enabled && isDemoMode ? "#ef4444" : undefined,
                      }}
                      transition={{ 
                        delay: index * 0.05,
                        borderColor: { duration: 0.3, repeat: !rule.enabled && isDemoMode ? 2 : 0, repeatType: "reverse" }
                      }}
                      className={cn(
                        "group flex items-center justify-between rounded-lg border bg-card p-4 transition-all duration-200",
                        rule.enabled
                          ? "border-primary/15 hover:border-primary/30"
                          : "border-border opacity-60 hover:opacity-80"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
                            rule.enabled
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <rule.icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {rule.label}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-mono px-1.5",
                                severity.border,
                                severity.color
                              )}
                            >
                              {rule.severity.toUpperCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono px-1.5 border-border text-muted-foreground"
                            >
                              {rule.category}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {rule.description}
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div className="text-sm">
                      {!rule.enabled && (
                        <div className="text-destructive font-medium mb-2">
                          ⚠️ Risk Increase Detected
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        Turning this {rule.enabled ? "on" : "off"} {rule.enabled ? "enhances" : "increases exposure to"} {rule.category} risk
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Severity: {rule.severity.toUpperCase()} (Weight: {SEVERITY_WEIGHTS[rule.severity]})
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
              })}
            </div>
          </div>

          {/* Right Column: Strategy & Settings */}
          <div className="flex flex-col gap-6">
            {/* Masking Strategy */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-secondary/30 px-4 py-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Masking Strategy
                </span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {MASKING_STRATEGIES.map((strategy) => {
                  const isActive = maskingStrategy === strategy.id;
                  return (
                    <button
                      key={strategy.id}
                      type="button"
                      onClick={() => {
                        setMaskingStrategy(strategy.id);
                        const rulesEnabled: Record<string, boolean> = {};
                        rules.forEach((r) => {
                          rulesEnabled[r.id] = r.enabled;
                        });
                        setConfig({
                          enabledEntities: deriveEnabledEntities(rules),
                          rulesEnabled,
                          maskingStrategy: strategy.id,
                        });
                        setSaved(false);
                        setLastUpdated(new Date());
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-md border p-3 text-left transition-all duration-200",
                        isActive
                          ? "border-primary/30 bg-primary/5"
                          : "border-border hover:border-primary/15 hover:bg-secondary/30"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                          isActive
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <strategy.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isActive ? "text-primary" : "text-foreground"
                          )}
                        >
                          {strategy.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {strategy.description}
                        </span>
                        <code className="mt-1 rounded-sm bg-secondary px-2 py-1 text-[10px] font-mono text-muted-foreground">
                          {strategy.example}
                        </code>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Retention Policy */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-secondary/30 px-4 py-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Retention Policy
                </span>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                    Log Retention Period
                  </label>
                  <Select value={retentionDays} onValueChange={(val) => { setRetentionDays(val); setSaved(false); }}>
                    <SelectTrigger className="h-9 font-mono text-xs bg-secondary/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                      <SelectItem value="365">365 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-mono text-foreground">Auto-purge logs</span>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-mono text-foreground">Encrypt at rest</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            {/* Compliance Status */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-secondary/30 px-4 py-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Compliance Status
                </span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {[
                  { name: "GDPR", status: "Compliant", active: true },
                  { name: "HIPAA", status: "Compliant", active: true },
                  { name: "PCI-DSS", status: "Compliant", active: true },
                  { name: "SOC 2", status: "Pending Audit", active: false },
                ].map((compliance) => (
                  <div
                    key={compliance.name}
                    className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-3 py-2"
                  >
                    <span className="text-[11px] font-mono text-foreground">
                      {compliance.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          compliance.active ? "bg-primary" : "bg-neon-amber"
                        )}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-mono",
                          compliance.active ? "text-primary" : "text-neon-amber"
                        )}
                      >
                        {compliance.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
