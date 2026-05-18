"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DesktopRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    if (window.innerWidth >= 768) {
      router.replace(to);
    }
  }, [to, router]);
  return null;
}
