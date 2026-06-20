"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validation";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Lock, User, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function RegisterForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const { register: signup } = useAuth();
    const router = useRouter();

    const {
        register: registerField,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
    });

    const password = watch("password", "");

    useEffect(() => {
        let score = 0;
        if (!password) {
            setPasswordStrength(0);
            return;
        }
        if (password.length >= 8) score += 25;
        if (/[A-Z]/.test(password)) score += 25;
        if (/[0-9]/.test(password)) score += 25;
        if (/[^A-Za-z0-9]/.test(password)) score += 25;
        setPasswordStrength(score);
    }, [password]);

    const onSubmit = async (data: RegisterInput) => {
        setLoading(true);
        try {
            await signup(data.email, data.password, data.name);
            toast.success("Account created!", {
                description: "Welcome to PrivacyProxy. Redirecting...",
            });
            router.push("/");
        } catch (error: any) {
            console.error("Registration Error:", error);
            toast.error("Registration failed", {
                description: error.response?.data?.detail || "Could not create account.",
            });
        } finally {
            setLoading(false);
        }
    };

    const onError = (errors: any) => {
        console.log("Form Errors:", errors);
        toast.error("Form invalid", {
            description: "Please check the highlighted fields for errors.",
        });
    };

    const strengthColor =
        passwordStrength <= 25
            ? "bg-destructive"
            : passwordStrength <= 50
                ? "bg-amber-500"
                : passwordStrength <= 75
                    ? "bg-blue-500"
                    : "bg-primary";

    return (
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-1">
                    Full Name
                </label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        {...registerField("name")}
                        type="text"
                        placeholder="John Doe"
                        className={cn(
                            "w-full rounded-lg border border-border bg-secondary/50 py-2 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                            errors.name && "border-destructive focus:ring-destructive"
                        )}
                    />
                </div>
                {errors.name && (
                    <p className="text-[10px] text-destructive ml-1">{errors.name.message}</p>
                )}
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-1">
                    Secure Email
                </label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        {...registerField("email")}
                        type="email"
                        placeholder="admin@privacyproxy.io"
                        className={cn(
                            "w-full rounded-lg border border-border bg-secondary/50 py-2 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                            errors.email && "border-destructive focus:ring-destructive"
                        )}
                    />
                </div>
                {errors.email && (
                    <p className="text-[10px] text-destructive ml-1">{errors.email.message}</p>
                )}
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-1">
                    Master Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        {...registerField("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={cn(
                            "w-full rounded-lg border border-border bg-secondary/50 py-2 pl-10 pr-10 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
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
                    <p className="text-[10px] text-destructive ml-1">{errors.password.message}</p>
                )}

                {/* Strength Meter */}
                <div className="mt-2 space-y-1.5 px-1">
                    <div className="flex h-1 gap-1 overflow-hidden rounded-full bg-secondary">
                        <div className={cn("h-full transition-all duration-500", strengthColor)} style={{ width: `${passwordStrength}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono uppercase tracking-tighter">
                        <span className={cn(passwordStrength > 0 ? "text-primary" : "text-muted-foreground")}>
                            {passwordStrength <= 25 ? "Weak" : passwordStrength <= 50 ? "Fair" : passwordStrength <= 75 ? "Good" : "Secure"}
                        </span>
                        <span className="text-muted-foreground">{passwordStrength}% Entropy</span>
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-1">
                    Verify Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        {...registerField("confirmPassword")}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={cn(
                            "w-full rounded-lg border border-border bg-secondary/50 py-2 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                            errors.confirmPassword && "border-destructive focus:ring-destructive"
                        )}
                    />
                </div>
                {errors.confirmPassword && (
                    <p className="text-[10px] text-destructive ml-1">{errors.confirmPassword.message}</p>
                )}
            </div>

            <div className="flex items-start gap-2 px-1 pt-2">
                <input
                    type="checkbox"
                    id="terms"
                    required
                    className="mt-0.5 h-3 w-3 rounded border-border bg-secondary text-primary focus:ring-primary"
                />
                <label htmlFor="terms" className="text-[10px] text-muted-foreground leading-tight">
                    I agree to the <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span> and <span className="text-primary hover:underline cursor-pointer">Terms of Zero-Trust Service</span>.
                </label>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 mt-4 shadow-lg shadow-primary/20"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        Initialize Account
                        <CheckCircle2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                    </>
                )}
            </button>

            <p className="text-center text-xs text-muted-foreground mt-4">
                Already have a vault?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                </Link>
            </p>
        </form>
    );
}
