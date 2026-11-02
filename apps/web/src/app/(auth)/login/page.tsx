"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth?tab=login");
  }, [router]);

  return (
    <div className="auth-wrapper flex items-center justify-center">
      <div className="text-[#66350F] font-semibold text-sm">Redirecting to NIVARAN Sign In...</div>
    </div>
  );
}
