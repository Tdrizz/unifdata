"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { SyncNowButton } from "@/components/ui/SyncNowButton";
import { disconnectIntegrationAction } from "@/features/settings/actions";
import { INTEGRATIONS_CATALOG, INTEGRATION_CATEGORIES, type IntegrationMeta } from "@/lib/integrations/catalog";

type IntegrationRow = {
  id: string;
  provider: string;
  provider_account_name: string | null;
  status: string;
  created_at: string;
};

type PopupResultMessage = {
  type: "unifdata-integration-result";
  provider: string;
  connected: string | null;
  error: string | null;
};

function isPopupResultMessage(data: unknown): data is PopupResultMessage {
  return !!data && typeof data === "object" && (data as { type?: unknown }).type === "unifdata-integration-result";
}

function IntegrationCard({ meta, connection }: { meta: IntegrationMeta; connection: IntegrationRow | undefined }) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const router = useRouter();
  const connected = !!connection;

  function connect() {
    setConnecting(true);
    // A real popup window (not a modal in the DOM) -- the OAuth flow
    // happens entirely inside it, on the provider's own login page, and
    // never navigates this tab away. window.opener stays set by default
    // here (no "noopener" feature passed), which is what lets the
    // callback route's finalizeIntegrationResponse() post the result back.
    const popup = window.open(
      `/api/integrations/${meta.provider}/start?popup=1`,
      "integration-connect",
      "width=520,height=680,noopener=no",
    );
    if (!popup) {
      setConnecting(false);
      toast.error("Your browser blocked the popup. Allow popups for this site and try again.");
      return;
    }

    // The callback route closes the popup itself once it posts a result,
    // which the message listener below already handles -- this only
    // matters for someone who closes the popup by hand mid-flow, which
    // would otherwise leave the button stuck on "Connecting…" forever
    // since no message ever arrives in that case.
    const watchClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(watchClosed);
        setConnecting(false);
      }
    }, 500);
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await disconnectIntegrationAction(meta.provider);
      toast.success(`${meta.name} disconnected`);
      router.refresh();
    } catch {
      toast.error(`Could not disconnect ${meta.name}`);
    } finally {
      setDisconnecting(false);
    }
  }

  useEffect(() => {
    if (!connecting) return;
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || !isPopupResultMessage(event.data)) return;
      if (event.data.provider !== meta.provider) return;
      if (event.data.connected) {
        toast.success(`${meta.name} connected`);
        router.refresh();
      } else if (event.data.error) {
        toast.error(`Couldn't connect ${meta.name}. Try again.`);
      }
      setConnecting(false);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [connecting, meta.provider, meta.name, router]);

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-ud bg-ud-surface p-5 shadow-ud">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[14.5px] font-semibold text-ud-ink">{meta.name}</p>
          <p className="mt-1 text-[12.5px] leading-[1.5] text-ud-muted">{meta.description}</p>
        </div>
        {connected && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-ud-success-bg px-[9px] py-[3px] text-[11px] font-semibold text-ud-success">
            Connected
          </span>
        )}
      </div>

      {connected ? (
        <div className="flex flex-wrap items-center gap-2">
          <SyncNowButton provider={meta.provider} label={meta.name} />
          <button
            type="button"
            onClick={disconnect}
            disabled={disconnecting}
            className="rounded-[8px] border border-ud px-3 py-2 text-[12px] font-semibold text-ud-muted hover:border-ud-hard hover:text-ud-ink disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={connect}
          disabled={connecting}
          className="inline-flex w-fit items-center rounded-[8px] bg-ud-accent px-4 py-2 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>
      )}
    </div>
  );
}

export function IntegrationsView({ integrations }: { integrations: IntegrationRow[] }) {
  const byProvider = new Map(integrations.map((i) => [i.provider, i]));

  return (
    <div className="px-5 pt-6 pb-12 md:px-8 md:pt-7">
      <PageHeader
        eyebrow="Tools"
        title="Integrations"
        description="Connect the software you already use — everything syncs into your customers, jobs, and revenue automatically."
        className="mb-6"
      />
      <div className="space-y-8">
        {INTEGRATION_CATEGORIES.map((category) => {
          const items = INTEGRATIONS_CATALOG.filter((i) => i.category === category);
          if (items.length === 0) return null;
          return (
            <div key={category}>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-ud-faint">{category}</h2>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((meta) => (
                  <IntegrationCard key={meta.provider} meta={meta} connection={byProvider.get(meta.provider)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
