"use client";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard owner>
      {(s) => (
        <div className="flex h-dvh overflow-hidden">
          <AdminNav name={s.name} />
          <div className="scroll-touch pt-safe pb-safe min-w-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      )}
    </AuthGuard>
  );
}
