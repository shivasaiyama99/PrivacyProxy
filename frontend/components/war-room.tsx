"use client";

import React from "react"

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Zap,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  getEvents,
  getPiiDistribution,
  getStats,
  getTimeline,
  type AuditEvent,
  type StatsResponse,
  type TimelineBucket,
} from "@/lib/api";
import api from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// --- KPI Card ---
function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext: string;
  color: string;
  trend?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-5",
        color === "emerald" && "border-primary/20",
        color === "rose" && "border-destructive/20",
        color === "cyan" && "border-neon-cyan/20",
        color === "amber" && "border-neon-amber/20"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-[0.03]",
          color === "emerald" && "bg-primary",
          color === "rose" && "bg-destructive",
          color === "cyan" && "bg-neon-cyan",
          color === "amber" && "bg-neon-amber"
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-2xl font-semibold text-foreground tabular-nums">{value}</span>
          <span className="text-[11px] font-mono text-muted-foreground">{subtext}</span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md",
              color === "emerald" && "bg-primary/10 text-primary",
              color === "rose" && "bg-destructive/10 text-destructive",
              color === "cyan" && "bg-neon-cyan/10 text-neon-cyan",
              color === "amber" && "bg-neon-amber/10 text-neon-amber"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-primary">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const DEMO_EVENTS: AuditEvent[] = [
  {
    timestamp: new Date(Date.now() - 1000 * 20).toISOString(),
    action: "redaction_event",
    severity: "high",
    entities: ["CREDIT_CARD"],
    processing_time_ms: 42.1,
    safety_score: null,
    usability_score: null,
    message: "Sanitized input (synthetic) - redacted 1 entities: CREDIT_CARD",
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
    action: "audit_event",
    severity: "low",
    entities: [],
    processing_time_ms: null,
    safety_score: 95,
    usability_score: 88,
    message: "Audit completed - safety 95/100, usability 88/100",
  },
  {
    timestamp: new Date(Date.now() - 1000 * 120).toISOString(),
    action: "chat_proxy_event",
    severity: "low",
    entities: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
    processing_time_ms: null,
    safety_score: null,
    usability_score: null,
    message: "Chat forwarded (synthetic) - hidden: EMAIL_ADDRESS, PHONE_NUMBER",
  },
];

const DEMO_PII_DISTRIBUTION: Record<string, number> = {
  EMAIL_ADDRESS: 14,
  PHONE_NUMBER: 9,
  PERSON: 6,
  CREDIT_CARD: 2,
  US_SSN: 1,
  API_KEY: 3,
};

function buildDemoTimeline(hours: number): TimelineBucket[] {
  const now = new Date();
  const out: TimelineBucket[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 60 * 60 * 1000);
    const isoHour = new Date(
      Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), t.getUTCHours(), 0, 0, 0)
    ).toISOString();

    // Stable, non-random shape that still looks alive.
    const base = (i % 6) + 2;
    const count = base * 3;

    out.push({ hour: isoHour, count });
  }
  return out;
}

export function WarRoom() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const [backendStats, setBackendStats] = useState<StatsResponse | null>(null);
  const [backendEvents, setBackendEvents] = useState<AuditEvent[] | null>(null);
  const [backendDistribution, setBackendDistribution] = useState<Record<string, number> | null>(null);
  const [backendTimeline, setBackendTimeline] = useState<TimelineBucket[] | null>(null);

  const [statsError, setStatsError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [vaultStats, setVaultStats] = useState<any>(null);

  const isSimulated =
    hasFetchedOnce && (!backendStats || !backendEvents || !backendDistribution || !backendTimeline);

  const kpi = backendStats
    ? {
      threatsNeutralized: backendStats.total_redactions,
      avgLatency: backendStats.avg_processing_time_ms,
      detectionAccuracy: backendStats.avg_safety_score,
    }
    : {
      threatsNeutralized: 1245,
      avgLatency: 380,
      detectionAccuracy: 99.7,
    };

  const eventsToShow = backendEvents ?? DEMO_EVENTS;
  const distributionToShow = backendDistribution ?? DEMO_PII_DISTRIBUTION;
  const timelineToShow = backendTimeline ?? buildDemoTimeline(24);

  const radarData = (() => {
    const entries = Object.entries(distributionToShow);
    const max = entries.reduce((acc, [, v]) => Math.max(acc, v), 0);
    const fullMark = Math.max(1, max);
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, value]) => ({ category, value, fullMark }));
  })();

  // Fetch backend analytics
  useEffect(() => {
    if (!mounted) return;

    const fetchAll = async () => {
      try {
        const [stats, eventsResp, distResp, timelineResp] = await Promise.all([
          getStats(),
          getEvents(200),
          getPiiDistribution(),
          getTimeline(24),
        ]);

        setBackendStats(stats);
        setBackendEvents(eventsResp.events);
        setBackendDistribution(distResp.totals);
        setBackendTimeline(timelineResp.buckets);
        setStatsError(null);
        setHasFetchedOnce(true);
      } catch (error) {
        // Do not clear existing data. If we have nothing yet, UI will fall back.
        console.warn("Analytics APIs unavailable:", error);
        setStatsError("Backend analytics unavailable - showing simulated data");
        setHasFetchedOnce(true);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [mounted]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchVaultStats = async () => {
      try {
        const res = await api.get('/vault/analytics');
        setVaultStats(res.data);
      } catch (e) {
        // Silently fail if not authenticated or no vault data
        console.log('Vault analytics not available');
      }
    };
    fetchVaultStats();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [eventsToShow]);

  const getSeverityColor = (sev: AuditEvent["severity"]) => {
    switch (sev) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-neon-cyan";
      case "info":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getSeverityIcon = (sev: AuditEvent["severity"]) => {
    switch (sev) {
      case "high":
        return "!!!";
      case "medium":
        return "!!";
      case "low":
        return "i";
      case "info":
        return "·";
      default:
        return "!";
    }
  };

  if (authLoading || (!user && mounted)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Incident Impact Summary (Last 24h)</h2>
        <p className="text-sm text-muted-foreground">
          How PrivacyProxy actively reduced security and compliance risk
        </p>
      </div>

      {/* Stats Error Banner */}
      {statsError && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-[11px] font-mono text-yellow-500">
            {statsError}
          </AlertDescription>
        </Alert>
      )}

      {/* Severity Legend */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="text-muted-foreground">Severity:</span>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-destructive" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span>Info</span>
        </div>
        {isSimulated && (
          <div className="ml-auto flex items-center gap-1 text-yellow-500">
            <span className="text-[10px]">SIMULATED</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KPICard
          icon={ShieldAlert}
          label="Threats Neutralized"
          value={kpi.threatsNeutralized.toLocaleString()}
          subtext="Last 24h"
          color="emerald"
          trend="+12.4%"
        />
        <KPICard
          icon={Zap}
          label="Processing Overhead"
          value={backendStats ? `< ${Math.round(kpi.avgLatency)}ms` : "< 380ms"}
          subtext="Average latency"
          color="cyan"
        />
        <KPICard
          icon={TrendingUp}
          label="Detection Accuracy"
          value={backendStats ? `${kpi.detectionAccuracy.toFixed(1)}%` : "99.7%"}
          subtext="Safety score"
          color="amber"
          trend={backendStats ? undefined : "+0.3%"}
        />
      </div>

      {/* Middle Row: Radar + Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Threat Radar */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-secondary/30 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Threat Radar - Category Distribution
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              LIVE
            </Badge>
          </div>
          <div className="p-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="hsl(240 4% 16%)" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "hsl(215 14% 55%)", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, radarData[0]?.fullMark ?? 1]}
                  tick={{ fill: "hsl(215 14% 55%)", fontSize: 9 }}
                  axisLine={false}
                />
                <Radar
                  name="Detections"
                  dataKey="value"
                  stroke="hsl(160 84% 39%)"
                  fill="hsl(160 84% 39%)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interceptor Live Log */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          <div className="border-b border-border bg-secondary/30 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Interceptor Live Log
            </span>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-[10px] font-mono text-destructive">RECORDING</span>
            </div>
          </div>
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto scrollbar-cyber bg-[hsl(240,5%,5%)] p-3 h-[280px] font-mono"
          >
            <AnimatePresence>
              {mounted ? (
                eventsToShow.map((event) => {
                  // Format timestamp consistently for SSR/CSR to prevent hydration mismatch
                  const date = new Date(event.timestamp);
                  const hours = date.getHours();
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  const seconds = date.getSeconds().toString().padStart(2, '0');
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  const displayHours = hours % 12 || 12;
                  const timeStr = `${displayHours}:${minutes}:${seconds} ${ampm}`;

                  return (
                    <motion.div
                      key={`${event.timestamp}-${event.action}-${event.message}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-2 py-1 text-[11px] leading-relaxed"
                    >
                      <span className="text-muted-foreground/60 shrink-0">
                        [{timeStr}]
                      </span>
                      <span
                        className={cn("shrink-0 font-bold", getSeverityColor(event.severity))}
                      >
                        {getSeverityIcon(event.severity)} {event.severity.toUpperCase()}:
                      </span>
                      <span className="text-foreground/80">{event.message}</span>
                      {event.entities && event.entities.length > 0 && (
                        <span className="text-muted-foreground/60 shrink-0">
                          [{Array.from(new Set(event.entities)).slice(0, 3).join(", ")}
                          {event.entities.length > 3 ? "…" : ""}]
                        </span>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground/40 py-8 text-[11px] font-mono">
                  Loading events...
                </div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-muted-foreground/40 text-[11px]">{">"}</span>
              <span className="inline-block w-1.5 h-3.5 bg-primary animate-terminal-blink" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Timeline */}
      <div className="grid grid-cols-1 gap-4">
        {/* Activity Timeline */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-secondary/30 px-4 py-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Threat Interception Timeline - 24h
            </span>
          </div>
          <div className="p-4 h-[220px]">
            {mounted && timelineToShow.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineToShow.map((b) => {
                    const d = new Date(b.hour);
                    const h = d.getHours();
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const dh = h % 12 || 12;
                    return {
                      time: `${dh}${ampm}`,
                      count: b.count,
                    };
                  })}
                >
                  <defs>
                    <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(347 77% 52%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(347 77% 52%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 12%)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "hsl(215 14% 55%)", fontSize: 9, fontFamily: "var(--font-geist-mono)" }}
                    stroke="hsl(240 4% 16%)"
                    interval={3}
                  />
                  <YAxis
                    tick={{ fill: "hsl(215 14% 55%)", fontSize: 9 }}
                    stroke="hsl(240 4% 16%)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(240 5% 8%)",
                      border: "1px solid hsl(240 4% 16%)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontFamily: "var(--font-geist-mono)",
                      color: "hsl(210 20% 92%)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(160 84% 39%)"
                    fill="url(#threatGradient)"
                    strokeWidth={1.5}
                    name="Events"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground/40 text-[11px] font-mono">
                Loading timeline...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vault Security Overview */}
      {vaultStats && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">🔒 Vault Security Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm">Total Files</div>
              <div className="text-2xl font-bold text-white">{vaultStats.total_files}</div>
            </div>
            <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm">Active Links</div>
              <div className="text-2xl font-bold text-green-400">{vaultStats.active_links}</div>
            </div>
            <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm">Total Views</div>
              <div className="text-2xl font-bold text-blue-400">{vaultStats.total_views}</div>
            </div>
            <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm">Security Alerts (24h)</div>
              <div className={`text-2xl font-bold ${vaultStats.security_events_24h > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {vaultStats.security_events_24h}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <div className="text-green-400 font-bold text-lg">{vaultStats.links_by_status?.active ?? 0}</div>
              <div className="text-green-400/70 text-xs">Active</div>
            </div>
            <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 text-center">
              <div className="text-gray-400 font-bold text-lg">{vaultStats.links_by_status?.expired ?? 0}</div>
              <div className="text-gray-400/70 text-xs">Expired</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
              <div className="text-red-400 font-bold text-lg">{vaultStats.links_by_status?.revoked ?? 0}</div>
              <div className="text-red-400/70 text-xs">Revoked</div>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
              <div className="text-orange-400 font-bold text-lg">{vaultStats.links_by_status?.burned ?? 0}</div>
              <div className="text-orange-400/70 text-xs">Burned</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
