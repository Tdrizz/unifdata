"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f4f3f0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "448px", borderRadius: "14px", border: "1px solid rgba(23,22,20,0.08)", background: "#ffffff", padding: "24px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "#a83232", margin: 0 }}>
              Something went wrong
            </p>
            <h2 style={{ marginTop: "8px", fontSize: "17px", fontWeight: 600, color: "#171614", marginBottom: 0 }}>
              This page could not be loaded.
            </h2>
            <p style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.6", color: "#6b6760", marginBottom: 0 }}>
              Try refreshing. If it keeps happening, reload the page from your browser.
            </p>
            {error.digest && (
              <p style={{ marginTop: "12px", borderRadius: "8px", border: "1px solid rgba(23,22,20,0.08)", background: "#eeece7", padding: "8px 12px", fontSize: "11px", color: "#a09b91", fontWeight: 500, margin: "12px 0 0" }}>
                Ref: {error.digest}
              </p>
            )}
            <div style={{ marginTop: "20px", display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={reset}
                style={{ borderRadius: "9px", background: "#4A3FA8", padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "#ffffff", border: "none", cursor: "pointer" }}
              >
                Try again
              </button>
              <a
                href="/workspace"
                style={{ borderRadius: "9px", border: "1px solid rgba(23,22,20,0.08)", background: "#ffffff", padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "#6b6760", textDecoration: "none" }}
              >
                Go to workspace
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
