import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Loader2 } from "lucide-react";

export const metadata = {
    title: "Reset Master Password | PrivacyProxy",
    description: "Set a new master password for your vault.",
};

export default function ResetPasswordPage() {
    return (
        <AuthLayout
            title="Secure Reset"
            subtitle="Establish new master credentials for your vault."
        >
            <Suspense fallback={
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            }>
                <ResetPasswordForm />
            </Suspense>
        </AuthLayout>
    );
}
