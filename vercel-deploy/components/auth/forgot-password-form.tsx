"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/validation";
import { authApi } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordInput>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordInput) => {
        setLoading(true);
        try {
            await authApi.forgotPassword(data.email);
            setSubmitted(true);
            toast.success("Instructions sent!", {
                description: "Check your email for password reset link.",
            });
        } catch (error: any) {
            toast.error("Process failed", {
                description: "Could not initiate password reset. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Send className="h-6 w-6 text-primary" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-medium text-foreground">Email Dispatched</h3>
                    <p className="text-sm text-muted-foreground">
                        If an account exists for that email, you will receive reset instructions shortly.
                    </p>
                </div>
                <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Authorized Access
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground ml-1">
                    Registered Email
                </label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        {...register("email")}
                        type="email"
                        placeholder="admin@privacyproxy.io"
                        className={cn(
                            "w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                            errors.email && "border-destructive focus:ring-destructive"
                        )}
                    />
                </div>
                {errors.email && (
                    <p className="text-[11px] text-destructive ml-1">{errors.email.message}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        Send Recovery Link
                        <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                )}
            </button>

            <div className="text-center">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Abort and return to Login
                </Link>
            </div>
        </form>
    );
}
