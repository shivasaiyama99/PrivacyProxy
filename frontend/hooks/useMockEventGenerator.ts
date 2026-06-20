"use client";

import { useState, useEffect, useRef } from "react";

interface MockEvent {
  id: string;
  timestamp: Date;
  type: "THREAT" | "SCAN" | "COMPLIANCE" | "SYSTEM";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  source: string;
  piiCount?: number;
  riskScore?: number;
}

interface MockKPI {
  threatsNeutralized: number;
  detectionAccuracy: number;
}

const MOCK_EVENTS = [
  {
    type: "THREAT" as const,
    severity: "critical" as const,
    messages: [
      "Credit card detected in user input - redacted successfully",
      "SSN pattern found in medical records - masked",
      "API key exposure blocked in real-time",
      "AWS credentials intercepted and sanitized"
    ],
    sources: ["Privacy Shield", "PII Scanner", "API Gateway", "Data Pipeline"]
  },
  {
    type: "SCAN" as const,
    severity: "high" as const,
    messages: [
      "Batch scan completed - 1,247 documents processed",
      "Email address redaction applied to marketing data",
      "Phone number masking completed for contact list",
      "Name anonymization finished for user database"
    ],
    sources: ["Batch Processor", "Email Service", "CRM System", "User Database"]
  },
  {
    type: "COMPLIANCE" as const,
    severity: "medium" as const,
    messages: [
      "GDPR compliance check passed - all PII protected",
      "HIPAA audit successful - medical data secured",
      "PCI-DSS validation completed - payment info safe",
      "SOC 2 controls verified - access logs intact"
    ],
    sources: ["Compliance Engine", "Audit System", "Security Monitor", "Governance"]
  },
  {
    type: "SYSTEM" as const,
    severity: "low" as const,
    messages: [
      "System health check - all services operational",
      "Database backup completed successfully",
      "Performance metrics within normal range",
      "Security patches applied automatically"
    ],
    sources: ["Health Monitor", "Backup Service", "Performance Monitor", "Update Service"]
  }
];

export function useMockEventGenerator(isDemoMode: boolean = false) {
  const [events, setEvents] = useState<MockEvent[]>([]);
  const [kpi, setKpi] = useState<MockKPI>({
    threatsNeutralized: 1245,
    detectionAccuracy: 99.2,
  });
  const eventIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const generateEvent = (): MockEvent => {
    const template = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
    const message = template.messages[Math.floor(Math.random() * template.messages.length)];
    const source = template.sources[Math.floor(Math.random() * template.sources.length)];
    
    return {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: template.type,
      severity: template.severity,
      message,
      source,
      piiCount: Math.floor(Math.random() * 10) + 1,
      riskScore: Math.floor(Math.random() * 100) + 1
    };
  };

  const updateKPI = () => {
    setKpi(prev => ({
      threatsNeutralized: prev.threatsNeutralized + Math.floor(Math.random() * 3) + 1,
      detectionAccuracy: Math.min(99.9, prev.detectionAccuracy + (Math.random() * 0.1 - 0.05))
    }));
  };

  const startEventGeneration = () => {
    if (intervalRef.current) return;
    
    // Generate initial events
    const initialEvents = Array.from({ length: 5 }, generateEvent);
    setEvents(initialEvents.reverse());

    // Start generating events every 1-2 seconds
    intervalRef.current = setInterval(() => {
      const newEvent = generateEvent();
      setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50 events
      updateKPI();
    }, Math.random() * 1000 + 1000);
  };

  const stopEventGeneration = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      startEventGeneration();
    } else {
      stopEventGeneration();
    }

    return () => {
      stopEventGeneration();
    };
  }, [isDemoMode]);

  const addManualEvent = (event: Omit<MockEvent, 'id' | 'timestamp'>) => {
    const newEvent: MockEvent = {
      ...event,
      id: `manual-${Date.now()}`,
      timestamp: new Date()
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 50));
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return {
    events,
    kpi,
    addManualEvent,
    clearEvents,
    isGenerating: intervalRef.current !== null
  };
}
