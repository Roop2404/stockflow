import { AuthCard } from "@/components/auth/AuthCard";
import { RegistrationForm } from "@/components/auth/RegistrationForm";

export default function RegisterPage() {
  return <AuthCard title="Create your workspace" description="Start with your organization and owner account."><RegistrationForm /></AuthCard>;
}
