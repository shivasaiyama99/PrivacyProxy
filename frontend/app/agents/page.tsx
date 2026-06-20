"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Bug, Scale, ArrowLeft, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/dashboard-shell";

interface Agent {
  name: string;
  title: string;
  role: string;
  keyFact: string;
  vibe: string;
  icon: React.ElementType;
  gradient: string;
  borderColor: string;
}

const agents: Agent[] = [
  {
    name: "The Hacker",
    title: "Security Auditor",
    role: "Redaction Security Auditor",
    keyFact: "Attacks redacted text to find 'Contextual Leaks'",
    vibe: "Aggressive, Sharp, White-Hat",
    icon: Bug,
    gradient: "from-red-500/20 via-orange-500/10 to-transparent",
    borderColor: "border-red-500/30 hover:border-red-500/50",
  },
  {
    name: "The Judge",
    title: "Usability Analyst",
    role: "Product Quality Manager",
    keyFact: "Ensures the text is still readable and functional for the AI",
    vibe: "Logical, Precise, Balanced",
    icon: Scale,
    gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
    borderColor: "border-blue-500/30 hover:border-blue-500/50",
  },
  {
    name: "The CISO",
    title: "Chief Information Security Officer",
    role: "Final Decision Maker",
    keyFact: "Synthesizes reports into a final Safety & Usability Score",
    vibe: "Authoritative, Professional, Executive",
    icon: Shield,
    gradient: "from-primary/20 via-emerald-500/10 to-transparent",
    borderColor: "border-primary/30 hover:border-primary/50",
  },
];

export default function AgentsPage() {
  return (
    <DashboardShell>
      <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            BACK TO SHIELD
          </Link>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Multi-Agent System
            </h1>
            <p className="text-lg text-muted-foreground font-mono">
              Three specialized AI agents working in harmony to ensure privacy and functionality
            </p>
          </div>
        </motion.div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "group relative rounded-lg border bg-card overflow-hidden transition-all duration-300",
                agent.borderColor
              )}
            >
              {/* Glassmorphism gradient background */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity",
                  agent.gradient
                )}
              />

              {/* Content */}
              <div className="relative p-6 space-y-4">
                {/* Icon */}
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm">
                    <agent.icon className="h-6 w-6 text-primary" />
                  </div>
                  <Zap className="h-4 w-4 text-primary/40 group-hover:text-primary transition-colors" />
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">{agent.name}</h2>
                  <p className="text-xs font-mono uppercase tracking-wider text-primary">
                    {agent.title}
                  </p>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Role
                  </div>
                  <p className="text-sm text-foreground">{agent.role}</p>
                </div>

                {/* Key Fact */}
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Key Fact
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{agent.keyFact}</p>
                </div>

                {/* Vibe */}
                <div className="pt-2 border-t border-border/50">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Vibe
                  </div>
                  <p className="text-xs font-mono text-primary">{agent.vibe}</p>
                </div>
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          ))}
        </div>

        {/* Workflow Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg border border-border bg-card p-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">How They Work Together</h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <span className="text-xs font-mono text-red-500">1</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Security Audit</h3>
                <p className="text-sm text-muted-foreground">
                  The Hacker attempts to re-identify individuals or extract sensitive info from contextual clues in the redacted text.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-xs font-mono text-blue-500">2</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Usability Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  The Judge evaluates whether the redacted text maintains coherence and usefulness for AI processing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-xs font-mono text-primary">3</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Final Decision</h3>
                <p className="text-sm text-muted-foreground">
                  The CISO synthesizes both reports and delivers a comprehensive Safety Score (0-100) and Usability Score (0-100).
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-6 py-3 text-sm font-mono text-primary hover:bg-primary/20 transition-colors"
          >
            <Shield className="h-4 w-4" />
            TRY THE PRIVACY SHIELD
          </Link>
        </motion.div>
      </div>
    </div>
    </DashboardShell>
  );
}
