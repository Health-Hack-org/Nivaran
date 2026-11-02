"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth?tab=signup");
  }, [router]);

  return (
    <div className="auth-wrapper flex items-center justify-center">
      <div className="text-[#66350F] font-semibold text-sm">Redirecting to NIVARAN Registration...</div>
    </div>
  );
}
