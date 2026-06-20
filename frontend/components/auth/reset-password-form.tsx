"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validation";
import { authApi } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordInput>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordInput) => {
        if (!token) {
            toast.error("Invalid Request", {
                description: "Missing password reset token.",
            });
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword(token, data.password);
            toast.success("Password Updated", {
                description: "Your master password has been securely updated.",
            });
            router.push("/login");
        } catch (error: any) {
            toast.error("Reset Failed", {
                description: error.response?.data?.detail || "Invalid or expired token.",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="rounded-lg bg-destructive/10 p-4 text-center">
                <p className="text-sm font-medium text-destructive">
                    Error: Missing or invalid security token.
                </p>
                <button
                    onClick={() => router.push("/forgot-password")}
                    className="mt-4 text-xs text-primary hover:underline"
                >
                    Request new token
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground ml-1">
                    New Master Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        {...register("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={cn(
                            "w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-10 pr-10 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                            errors.password && "border-destructive focus:ring-destructive"
                        )}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {errors.password && (
                    <p className="text-[11px] text-destructive ml-1">{errors.password.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground ml-1">
                    Confirm New Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        {...register("confirmPassword")}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={cn(
                            "w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                            errors.confirmPassword && "border-destructive focus:ring-destructive"
                        )}
                    />
                </div>
                {errors.confirmPassword && (
                    <p className="text-[11px] text-destructive ml-1">{errors.confirmPassword.message}</p>
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
                        Apply New Credentials
                        <CheckCircle2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                    </>
                )}
            </button>
        </form>
    );
}
