import { ProtectedLayout } from "@/components/auth/ProtectedLayout";

export default function ProtectedGroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
