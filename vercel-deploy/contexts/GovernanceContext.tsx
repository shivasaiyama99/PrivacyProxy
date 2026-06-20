"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type PresidioEntityType =
  | "PHONE_NUMBER"
  | "CREDIT_CARD"
  | "EMAIL_ADDRESS"
  | "PERSON"
  | "US_SSN"
  | "API_KEY"
  | "IP_ADDRESS"
  | "LOCATION";

export type MaskingStrategy = "static" | "synthetic" | "hash";

export interface GovernanceConfig {
  enabledEntities: PresidioEntityType[];
  rulesEnabled?: Record<string, boolean>;
  maskingStrategy?: MaskingStrategy;
}

interface GovernanceContextType {
  config: GovernanceConfig;
  setConfig: (next: GovernanceConfig) => void;
}

const STORAGE_KEY = "governance_config_v1";

const DEFAULT_CONFIG: GovernanceConfig = {
  enabledEntities: [
    "CREDIT_CARD",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "API_KEY",
    "IP_ADDRESS",
    "US_SSN",
  ],
  rulesEnabled: undefined,
  maskingStrategy: undefined,
};

const GovernanceContext = createContext<GovernanceContextType | undefined>(undefined);

function safeParseConfig(raw: string | null): GovernanceConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GovernanceConfig>;
    if (!parsed || !Array.isArray(parsed.enabledEntities)) return null;
    return {
      enabledEntities: parsed.enabledEntities as PresidioEntityType[],
      rulesEnabled:
        parsed.rulesEnabled && typeof parsed.rulesEnabled === "object"
          ? (parsed.rulesEnabled as Record<string, boolean>)
          : undefined,
      maskingStrategy: parsed.maskingStrategy as MaskingStrategy | undefined,
    };
  } catch {
    return null;
  }
}

export function GovernanceProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<GovernanceConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromStorage = safeParseConfig(localStorage.getItem(STORAGE_KEY));
    if (fromStorage) setConfig(fromStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore storage errors
    }
  }, [config]);

  const value = useMemo(() => ({ config, setConfig }), [config]);

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>;
}

export function useGovernance() {
  const context = useContext(GovernanceContext);
  if (context === undefined) {
    throw new Error("useGovernance must be used within a GovernanceProvider");
  }
  return context;
}

export function getGovernanceStorageKey() {
  return STORAGE_KEY;
}
