"use client";

import { useState } from "react";
import {
  Shield,
  Radar,
  Settings,
  Activity,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShieldChat } from "@/components/shield-chat";
import { WarRoom } from "@/components/war-room";
import { Governance } from "@/components/governance";

const NAV_ITEMS = [
  { id: "shield", label: "Shield Chat", icon: Shield, description: "Real-time Protection" },
  { id: "warroom", label: "War Room", icon: Radar, description: "Threat Analytics" },
  { id: "governance", label: "Governance", icon: Settings, description: "Rules & Config" },
] as const;

type ViewId = (typeof NAV_ITEMS)[number]["id"];

export function AegisShell() {
  const [activeView, setActiveView] = useState<ViewId>("shield");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 glow-emerald">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground tracking-wide">
                AEGIS<span className="text-primary">AI</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                Cyber Defense
              </span>
            </div>
          )}
        </div>

        {/* System Status */}
        {!collapsed && (
          <div className="mx-3 mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                System Operational
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-4 flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary glow-emerald"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span
                      className={cn(
                        "text-[10px] font-mono",
                        isActive ? "text-primary/60" : "text-muted-foreground/60"
                      )}
                    >
                      {item.description}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom stats */}
        {!collapsed && (
          <div className="mt-auto border-t border-border p-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <Activity className="h-3 w-3 text-primary" />
              <span>UPTIME: 99.97%</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
              <span>LATENCY: 12ms</span>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-cyber">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium text-foreground">
              {NAV_ITEMS.find((n) => n.id === activeView)?.label}
            </h1>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-muted-foreground">SHIELD ACTIVE</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-6">
          {activeView === "shield" && <ShieldChat />}
          {activeView === "warroom" && <WarRoom />}
          {activeView === "governance" && <Governance />}
        </div>
      </main>
    </div>
  );
}
