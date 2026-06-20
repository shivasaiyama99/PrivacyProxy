"use client";

import React from "react";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  Radar,
  Settings,
  Lock,
  ArrowRight,
  Activity,
  ShieldCheck,
  Zap,
  Eye,
  ChevronRight,
  Bot,
  Fingerprint,
  AlertTriangle,
  User,
  Terminal,
  Cpu,
  FileText,
  Scale,
  Globe,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ParticleNetwork } from "@/components/animations/particle-network";
import { GlitchText } from "@/components/animations/glitch-text";
import { ScanlineOverlay } from "@/components/animations/scanline-overlay";
import { TypingAnimation } from "@/components/animations/typing-animation";
import { GlowingPulseBadge } from "@/components/animations/glowing-pulse-badge";
import { FloatingShield3D } from "@/components/animations/floating-shield-3d";

// Stagger container + child variants for hero entrance
const heroContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const heroChildVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuart
    },
  },
};

// Spring config for button hover
const buttonHoverSpring = { stiffness: 300, damping: 20 };

// Animated counter hook
function useCounter(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// Live clock component for status bar
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return <span>{time}</span>;
}

// Shield logo animation component with float
function ShieldOrb() {
  return (
    <div className="relative flex items-center justify-center animate-hero-float">
      {/* Outer orbit ring */}
      <div className="absolute h-64 w-64 rounded-full border border-primary/10 animate-orbit">
        <div className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full bg-primary/40" />
      </div>
      {/* Middle orbit ring */}
      <div className="absolute h-48 w-48 rounded-full border border-primary/20 animate-orbit-reverse">
        <div className="absolute -bottom-1 right-4 h-2 w-2 rounded-full bg-neon-cyan/50" />
      </div>
      {/* Inner orbit ring */}
      <div className="absolute h-32 w-32 rounded-full border border-primary/15 animate-orbit" style={{ animationDuration: "12s" }} />
      {/* Core glow */}
      <div className="absolute h-24 w-24 rounded-full bg-primary/5 blur-xl" />
      <div className="absolute h-16 w-16 rounded-full bg-primary/10 blur-md" />
      {/* Shield icon center */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 glow-emerald"
      >
        <Shield className="h-9 w-9 text-primary" />
      </motion.div>
    </div>
  );
}

// Live stat ticker
function StatTicker({
  label,
  value,
  suffix,
  icon: Icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const count = useCounter(value, 300);
  return (
    <div className="flex flex-col items-center gap-1">
      {Icon && <Icon className="h-4 w-4 text-primary mb-1" />}
      <span className="text-2xl font-semibold text-foreground tabular-nums md:text-3xl font-mono">
        {count.toLocaleString()}
        {suffix}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// Command Module card with antigravity design
function CommandCard({
  icon: Icon,
  title,
  description,
  href,
  accentColor,
  statusBadge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  accentColor: string;
  statusBadge: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Link
        href={href}
        className="group relative flex flex-col gap-5 rounded-xl border border-white/[0.06] bg-card p-6 transition-all duration-300 hover:border-white/[0.12] overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          boxShadow: hovered
            ? `0 3px 20px ${accentColor}20, 0 0 40px ${accentColor}08`
            : `0 2px 12px ${accentColor}12`,
        }}
      >
        {/* Scan-line on hover */}
        {hovered && (
          <div
            className="absolute left-0 right-0 h-px animate-scan-line pointer-events-none z-10"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            }}
          />
        )}

        {/* Icon + Status badge row */}
        <div className="flex items-start justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <span
            className="rounded-full border px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-widest"
            style={{
              borderColor: `${accentColor}40`,
              color: accentColor,
            }}
          >
            {statusBadge}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground font-mono text-[12px]">
            {description}
          </p>
        </div>

        {/* Bottom action */}
        <div className="flex items-center justify-between mt-auto">
          <span
            className="text-[11px] font-mono uppercase tracking-wider transition-colors"
            style={{ color: accentColor }}
          >
            INITIALIZE ›
          </span>
          <div className="flex items-center gap-1">
            <span className="h-1 w-1 rounded-full pulse-dot-1" style={{ backgroundColor: accentColor }} />
            <span className="h-1 w-1 rounded-full pulse-dot-2" style={{ backgroundColor: accentColor }} />
            <span className="h-1 w-1 rounded-full pulse-dot-3" style={{ backgroundColor: accentColor }} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function HomePage() {
  const { user } = useAuth();

  // Scroll-based parallax for particle canvas
  const { scrollY } = useScroll();
  const particleScrollY = useTransform(scrollY, (v) => v);
  const [scrollVal, setScrollVal] = useState(0);
  useEffect(() => {
    const unsub = particleScrollY.on("change", (v) => setScrollVal(v));
    return unsub;
  }, [particleScrollY]);

  // Hex pattern SVG for background overlay
  const hexPatternBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.03'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Hex pattern background overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ backgroundImage: hexPatternBg }}
      />

      {/* Particle Network Canvas Background (parallax via scrollVal) */}
      <ParticleNetwork scrollY={scrollVal} />

      {/* Animated Grid + Scanline Overlay */}
      <ScanlineOverlay />

      {/* Fades */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent z-[2]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent z-[2]" />

      {/* System Status Bar */}
      <div className="relative z-20 flex w-full items-center justify-between border-b border-white/[0.04] bg-black/40 px-4 py-1.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#39ff14] animate-pulse" />
          <span className="text-[11px] font-mono text-white/50">
            PRIVACYPROXY v2.0 — SYSTEM ONLINE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-white/40 tabular-nums">
            <LiveClock />
          </span>
          <span className="text-[11px] font-mono text-[#00f0ff]">
            ● SECURE
          </span>
        </div>
      </div>

      {/* NEW Absolute Top Nav Bar Container — blur-in on load */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute left-0 right-0 top-[34px] z-[999] w-full min-h-[60px] px-6 py-4 flex flex-col md:flex-row md:items-center pointer-events-none"
      >
        {/* TOP LEFT: PrivacyProxy Logo */}
        <div className="md:absolute md:left-6 md:top-1/2 md:-translate-y-1/2 pointer-events-auto w-full md:w-auto flex flex-col md:flex-row items-center gap-6 mb-6 md:mb-0">
          <div className="flex items-center gap-3 group cursor-pointer transition-all">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 glow-emerald transition-transform group-hover:scale-105 shadow-md shadow-primary/20">
              <Lock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-extrabold tracking-wide text-foreground transition-colors group-hover:text-white">
                Privacy<span className="text-primary transition-colors group-hover:text-emerald-400">Proxy</span>
              </span>
            </div>
          </div>

          <GlowingPulseBadge className="hidden lg:inline-flex">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#00ff88] truncate">
              All Systems Operational
            </span>
          </GlowingPulseBadge>
        </div>

        {/* CENTER: Navigation Buttons + Auth (on mobile) */}
        <div className="w-full flex justify-center pointer-events-auto">
          <div className="flex flex-wrap items-center justify-center gap-4 max-w-lg md:max-w-none">
            <Link
              href="/shield"
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 transition-all hover:border-primary/40 hover:bg-primary/10 backdrop-blur-md"
            >
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Privacy Shield</span>
            </Link>
            <Link
              href="/warroom"
              className="flex items-center gap-2 rounded-lg border border-neon-cyan/20 bg-neon-cyan/5 px-4 py-2 transition-all hover:border-neon-cyan/40 hover:bg-neon-cyan/10 backdrop-blur-md"
            >
              <Radar className="h-4 w-4 text-neon-cyan" />
              <span className="text-sm font-medium text-foreground">Analytics</span>
            </Link>
            <Link
              href="/governance"
              className="flex items-center gap-2 rounded-lg border border-neon-amber/20 bg-neon-amber/5 px-4 py-2 transition-all hover:border-neon-amber/40 hover:bg-neon-amber/10 backdrop-blur-md"
            >
              <Settings className="h-4 w-4 text-neon-amber" />
              <span className="text-sm font-medium text-foreground">Governance</span>
            </Link>

            {/* AUTH BLOCK - Mobile Only */}
            <div className="flex md:hidden items-center gap-3 mt-4 w-full justify-center">
              {user ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 backdrop-blur-md">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{user.full_name}</span>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-white bg-black/40 px-4 py-2 rounded-lg backdrop-blur-md"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/50 px-4 py-2 text-sm font-semibold text-primary transition-all shadow-lg shadow-primary/20 backdrop-blur-md"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* TOP RIGHT: Auth Controls (Desktop) */}
        <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 pointer-events-auto items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 backdrop-blur-md">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{user.full_name}</span>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-white bg-black/40 px-4 py-2 rounded-lg backdrop-blur-md"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/50 px-4 py-2 text-sm font-semibold text-primary transition-all shadow-lg shadow-primary/20 backdrop-blur-md"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </motion.nav>

      {/* Content wrapper pushed down slightly since nav is absolute */}
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 py-12 pt-40 md:pt-48">
        {/* 3D Floating Shield behind hero text */}
        <div className="absolute inset-x-0 top-32 md:top-40 flex items-start justify-center pointer-events-none" style={{ height: "600px" }}>
          <FloatingShield3D />
        </div>

        {/* Hero section — stagger entrance */}
        <motion.div
          className="mb-20 flex flex-col items-center gap-10 text-center md:mb-28"
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
        >

          {/* Badge with typing animation */}
          <motion.div
            variants={heroChildVariants}
            className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 min-w-[280px] text-center"
          >
            <TypingAnimation
              text="ADVANCED PRIVACY PROTECTION SYSTEM"
              typeSpeed={60}
              deleteSpeed={30}
              pauseDuration={3000}
              className="text-[10px] font-mono uppercase tracking-widest text-primary"
            />
          </motion.div>

          {/* Title with full glitch animation */}
          <motion.h1
            variants={heroChildVariants}
            className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl"
          >
            <GlitchText
              text="Your AI Firewall for Sensitive Data"
              className="text-primary text-glow-emerald"
            />
          </motion.h1>

          {/* Two CTA buttons with hover glow */}
          <motion.div
            variants={heroChildVariants}
            className="flex items-center gap-4"
          >
            <motion.div
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 25px rgba(0,255,136,0.5)",
              }}
              transition={buttonHoverSpring}
              className="rounded-lg"
            >
              <Link
                href="/shield"
                className="group flex items-center gap-2.5 rounded-lg border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-6 py-3 text-sm font-medium text-[#00f0ff] transition-colors hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]/50"
              >
                <Terminal className="h-4 w-4" />
                <span>LAUNCH SHIELD</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 25px rgba(0,255,136,0.5)",
              }}
              transition={buttonHoverSpring}
              className="rounded-lg"
            >
              <Link
                href="/vault"
                className="group flex items-center gap-2.5 rounded-lg border border-[#ffbe0b]/30 bg-[#ffbe0b]/10 px-6 py-3 text-sm font-medium text-[#ffbe0b] transition-colors hover:bg-[#ffbe0b]/20 hover:border-[#ffbe0b]/50"
              >
                <Lock className="h-4 w-4" />
                <span>OPEN VAULT</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>

          {/* User info / Sign in section */}
          {user ? (
            <motion.div variants={heroChildVariants} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-6 py-4 backdrop-blur-md shadow-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-mono uppercase tracking-widest text-primary">Logged in as</span>
                <span className="text-lg font-semibold text-white">{user.full_name}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              variants={heroChildVariants}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/20 px-6 py-3 backdrop-blur-md shadow-2xl"
            >
              <Link
                href="/register"
                className="group flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-primary"
              >
                <span>New here? Create safe account</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <span className="h-4 w-px bg-white/20" />
              <Link
                href="/login"
                className="text-sm font-medium text-white transition-colors hover:text-primary"
              >
                Sign In
              </Link>
            </motion.div>
          )}
        </motion.div>

        {/* Problem + Solution — 2-column grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-20 mt-32 md:mt-56 w-full max-w-5xl md:mb-28"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Problem Card */}
            <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15">
                  <AlertTriangle className="h-4.5 w-4.5 text-red-400" />
                </div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-red-400">THE PROBLEM</h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: Zap,
                    title: "PII Leaks to LLMs",
                    desc: "Users unknowingly paste SSNs, credit cards, API keys into AI chatbots. That data hits third-party servers permanently with no recall.",
                  },
                  {
                    icon: Globe,
                    title: "Insecure File Sharing",
                    desc: "Sensitive documents shared via email or plain cloud links with zero access control, no expiry, no view limits, and no audit trail.",
                  },
                  {
                    icon: Eye,
                    title: "No Visibility or Audit",
                    desc: "Organizations have no way to know what PII was exposed, when it happened, or to whom. Compliance becomes a guessing game.",
                  },
                  {
                    icon: Smartphone,
                    title: "No Geo or Device Controls",
                    desc: "Once a file link is shared, it can be opened from any country, any device, any number of times, indefinitely.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-500/10 mt-0.5">
                      <item.icon className="h-3.5 w-3.5 text-red-400" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-foreground">{item.title}</span>
                      <p className="text-[12px] font-mono leading-relaxed text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Solution Card */}
            <div className="rounded-xl border border-[#00f0ff]/15 bg-[#00f0ff]/[0.03] p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00f0ff]/15">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#00f0ff]" />
                </div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#00f0ff]">THE SOLUTION</h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: Shield,
                    title: "Pillar 1 — PII Shield & AI Chat",
                    desc: "3-stage pipeline: Presidio NLP detects 8 entity types → CrewAI 3-agent crew (Hacker → Judge → Reporter) audits every redaction → Only sanitized text reaches Groq LLM. Hard gate blocks if safety score < 70.",
                  },
                  {
                    icon: Lock,
                    title: "Pillar 2 — Secure File Vault",
                    desc: "8-step zero-trust verification chain: Link exists → Status active → Not expired → View limit → Email match → Access code (bcrypt) → Geo-fence (GeoIP2) → Device lock (SHA-256).",
                  },
                  {
                    icon: Radar,
                    title: "Real-Time War Room",
                    desc: "Live KPI dashboards, hourly PII detection timelines, radar distribution charts, and a governance panel to toggle detection rules instantly.",
                  },
                  {
                    icon: FileText,
                    title: "Full Audit Trail",
                    desc: "Every action logged — redactions, uploads, geo-blocks, share events, chat messages — persisted to MongoDB and rotating JSONL files.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#00f0ff]/10 mt-0.5">
                      <item.icon className="h-3.5 w-3.5 text-[#00f0ff]" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-foreground">{item.title}</span>
                      <p className="text-[12px] font-mono leading-relaxed text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-20 grid w-full max-w-3xl grid-cols-2 gap-8 rounded-xl border border-border bg-card/50 p-8 backdrop-blur-sm md:grid-cols-4 md:mb-28"
        >
          <StatTicker icon={Fingerprint} label="PII Entity Types" value={8} />
          <StatTicker icon={Bot} label="AI Audit Agents" value={3} />
          <StatTicker icon={ShieldCheck} label="Verification Steps" value={8} />
          <StatTicker icon={Zap} label="API Endpoints" value={22} />
        </motion.div>

        {/* Command Modules */}
        <div className="mb-20 w-full md:mb-28">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-8 flex flex-col items-center gap-3 text-center"
          >
            {/* Pill badge */}
            <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5">
              <Cpu className="h-3 w-3 text-white/30" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                Command Modules
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-foreground md:text-3xl">
              Six Pillars of Privacy
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <CommandCard
              icon={Shield}
              title="PII Shield"
              description="Real-time PII detection & redaction via Presidio NLP + custom regex. 3 modes: Strict, Mask, Synthetic."
              href="/shield"
              accentColor="#00f0ff"
              statusBadge="CORE"
            />
            <CommandCard
              icon={Radar}
              title="War Room"
              description="Live analytics dashboard — hourly timeline, PII distribution radar, threat KPIs in real-time."
              href="/warroom"
              accentColor="#39ff14"
              statusBadge="LIVE"
            />
            <CommandCard
              icon={Scale}
              title="Governance"
              description="Toggle detection rules per PII category. Set global masking strategy. Compliance control center."
              href="/governance"
              accentColor="#a855f7"
              statusBadge="POLICY"
            />
            <CommandCard
              icon={Lock}
              title="Secure Vault"
              description="Encrypted file storage with GridFS. Auto PII scan on upload. SHA-256 integrity. 8-step zero-trust sharing."
              href="/vault"
              accentColor="#ffbe0b"
              statusBadge="VAULT"
            />
            <CommandCard
              icon={Activity}
              title="Audit Logs"
              description="Full audit trail — every redaction, upload, geo-block, and chat event. MongoDB + JSONL rotation."
              href="/auditlogs"
              accentColor="#f472b6"
              statusBadge="TRAIL"
            />
            <CommandCard
              icon={Bot}
              title="AI Agents"
              description="CrewAI 3-agent system: Hacker → Judge → Reporter. Every redaction is audited before LLM delivery."
              href="/agents"
              accentColor="#fb923c"
              statusBadge="CREW"
            />
          </div>
        </div>


        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex w-full items-center justify-between border-t border-border pt-8 pb-4"
        >
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              PrivacyProxy v2.0 | Privacy Protection Platform
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-mono text-muted-foreground">Uptime: 99.97%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
              <span className="text-[10px] font-mono text-muted-foreground">Latency: 12ms</span>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
