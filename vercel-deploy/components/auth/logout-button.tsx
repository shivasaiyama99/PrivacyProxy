"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function LogoutButton() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        toast.success("Signed out", {
            description: "Your session has been securely ended.",
        });
        router.push("/");
    };

    return (
        <AnimatePresence>
            {user && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    onClick={handleLogout}
                    className="fixed bottom-6 right-6 z-[100] flex h-12 w-12 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive shadow-lg backdrop-blur-md transition-all hover:bg-destructive hover:text-white glow-destructive"
                    title="Sign Out"
                >
                    <LogOut className="h-5 w-5" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
