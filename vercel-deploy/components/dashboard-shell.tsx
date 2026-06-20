"use client";

import React from "react"

import { useState } from "react";
import {
  Shield,
  Radar,
  Settings,
  Users,
  Activity,
  Lock,
  ChevronLeft,
  ChevronRight,
  Home,
  FolderLock,
  Link2,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { id: "shield", label: "Privacy Shield", icon: Shield, description: "PII Protection", href: "/shield" },
  { id: "warroom", label: "Analytics", icon: Radar, description: "Data Insights", href: "/warroom" },
  { id: "governance", label: "Governance", icon: Settings, description: "Rules & Config", href: "/governance" },
  { id: "agents", label: "Agents", icon: Users, description: "Multi-Agent System", href: "/agents" },
  { id: "vault", label: "File Vault", icon: FolderLock, description: "Secure Storage", href: "/vault" },
  { id: "vault-links", label: "Share Links", icon: Link2, description: "Active Shares", href: "/vault/links" },
  { id: "auditlogs", label: "Audit Logs", icon: ScrollText, description: "Security Actions", href: "/auditlogs" },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Match more specific routes first (e.g. /vault/links before /vault)
  const activeItem = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname.startsWith(item.href));

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
          <Link
            href="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 glow-emerald transition-transform hover:scale-105"
          >
            <Lock className="h-4 w-4 text-primary" />
          </Link>
          {!collapsed && (
            <Link href="/" className="flex flex-col">
              <span className="text-sm font-semibold text-foreground tracking-wide">
                PrivacyProxy<span className="text-primary"></span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                Privacy Protection
              </span>
            </Link>
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

        {/* Back to home */}
        <div className="mt-4 px-2">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
            )}
          >
            <Home className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium">Home</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeItem?.id === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
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
              </Link>
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
              {activeItem?.label ?? "Dashboard"}
            </h1>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activeItem?.id === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-mono transition-colors",
                      isActive
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-muted-foreground">SHIELD ACTIVE</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
