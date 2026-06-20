import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
    title: "Login | PrivacyProxy",
    description: "Securely sign in to your PrivacyProxy account.",
};

export default function LoginPage() {
    return (
        <AuthLayout
            title="Access Vault"
            subtitle="Authorized personnel only. Please verify your credentials."
        >
            <LoginForm />
        </AuthLayout>
    );
}
