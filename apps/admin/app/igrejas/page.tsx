"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IgrejasRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/igreja");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-whatsapp-teal border-t-transparent rounded-full" />
    </div>
  );
}
