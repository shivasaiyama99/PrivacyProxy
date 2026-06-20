"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Lock } from "lucide-react";
import Link from "next/link";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover opacity-70"
                >
                    <source src="/CS_ai_bg.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px]" />
            </div>

            <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-12">
                {/* Back to Home Button */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute left-6 top-6"
                >
                    <Link
                        href="/"
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition-all hover:bg-white/10"
                    >
                        <Shield className="h-4 w-4 text-primary" />
                        Back to Home
                    </Link>
                </motion.div>

                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 flex flex-col items-center gap-4"
                >
                    <Link href="/" className="group flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 glow-emerald transition-transform group-hover:scale-110">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                Privacy<span className="text-primary">Proxy</span>
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                Zero-Trust Authentication
                            </span>
                        </div>
                    </Link>
                </motion.div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full rounded-2xl border border-border bg-card/50 p-8 backdrop-blur-xl glow-emerald/5"
                >
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
                    </div>

                    {children}
                </motion.div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-muted-foreground">
                    &copy; 2024 PrivacyProxy. All rights reserved. <br />
                    Enterprise-grade protection for sensitive AI pipelines.
                </p>
            </div>
        </div>
    );
}
