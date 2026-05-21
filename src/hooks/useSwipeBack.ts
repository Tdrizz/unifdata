"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";

// Triggers router.back() when the user swipes right from the left edge (< 24px from left).
// Designed to mirror the iOS native swipe-back gesture.
export function useSwipeBack(enabled = true) {
  const router = useRouter();
  const startX = useRef(0);
  const startY = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    function onTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      active.current = startX.current < 24;
    }

    function onTouchMove(e: TouchEvent) {
      if (!active.current) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      // Cancel if the movement goes more vertical than horizontal
      if (dy > dx) active.current = false;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!active.current) return;
      active.current = false;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current);
      if (dx > 72 && dy < 60) {
        haptic("light");
        router.back();
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, router]);
}
