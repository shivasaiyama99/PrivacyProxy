import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
    title: "Recover Vault | PrivacyProxy",
    description: "Recover your PrivacyProxy account access.",
};

export default function ForgotPasswordPage() {
    return (
        <AuthLayout
            title="Identity Recovery"
            subtitle="Enter your email to receive a secure recovery link."
        >
            <ForgotPasswordForm />
        </AuthLayout>
    );
}
