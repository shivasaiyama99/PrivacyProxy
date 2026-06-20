import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
    title: "Register | PrivacyProxy",
    description: "Create a new PrivacyProxy account.",
};

export default function RegisterPage() {
    return (
        <AuthLayout
            title="Create New Vault"
            subtitle="Establish your secure identity on the PrivacyProxy platform."
        >
            <RegisterForm />
        </AuthLayout>
    );
}
