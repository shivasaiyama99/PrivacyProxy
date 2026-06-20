import React from "react"
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { GovernanceProvider } from "@/contexts/GovernanceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LogoutButton } from "@/components/auth/logout-button";
import { Toaster } from "sonner";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "PrivacyProxy | Privacy Protection Command Center",
  description:
    "Real-time AI-powered privacy protection dashboard with PII detection, data redaction, and compliance governance.",
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <DemoModeProvider>
            <GovernanceProvider>
              {children}
              <LogoutButton />
              <Toaster position="top-right" theme="dark" richColors />
            </GovernanceProvider>
          </DemoModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
