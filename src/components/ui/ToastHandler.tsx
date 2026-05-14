"use client";

import { useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function ToastHandlerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const toastMsg = searchParams.get("toast");
    const errorMsg = searchParams.get("error");

    if (!toastMsg && !errorMsg) return;

    if (toastMsg) toast.success(decodeURIComponent(toastMsg));
    if (errorMsg) toast.error(decodeURIComponent(errorMsg));

    const params = new URLSearchParams(searchParams.toString());
    params.delete("toast");
    params.delete("error");
    const newUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl);
  }, [searchParams, pathname, router]);

  return null;
}

export function ToastHandler() {
  return (
    <Suspense>
      <ToastHandlerInner />
    </Suspense>
  );
}
