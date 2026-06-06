"use client";

import { useEffect, useState } from "react";

type Platform = "android" | "ios" | null;

function getIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return;
    // Don't show if previously dismissed
    if (localStorage.getItem("install-prompt-dismissed")) return;

    if (getIOS()) {
      setPlatform("ios");
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("install-prompt-dismissed", "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  if (dismissed || !platform) return null;

  return (
    <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom)+12px)] left-4 right-4 z-50 md:hidden">
      <div className="bg-ud-surface border border-ud rounded-[14px] shadow-ud-pop p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-ud-accent/10 flex items-center justify-center shrink-0">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="text-ud-accent">
                <path d="M12 2L12 16M12 2L8 6M12 2L16 6" />
                <path d="M4 16v4a1 1 0 001 1h14a1 1 0 001-1v-4" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ud-ink">Add to Home Screen</p>
              {platform === "ios" ? (
                <p className="text-[11.5px] text-ud-muted mt-0.5">
                  Tap <span className="font-semibold">Share</span> then <span className="font-semibold">Add to Home Screen</span> for the full app experience.
                </p>
              ) : (
                <p className="text-[11.5px] text-ud-muted mt-0.5">
                  Install UnifData for faster access and a native app experience.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-ud-faint hover:text-ud-muted shrink-0 mt-0.5"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {platform === "android" && deferredPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="mt-3 w-full rounded-[9px] bg-ud-accent py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Install app
          </button>
        )}
      </div>
    </div>
  );
}
