"use client";

import { useState, useTransition } from "react";
import { createApiKey, revokeApiKey } from "../actions";

type ApiKey = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export function ApiKeyManager({
  apiKeys: initialKeys,
  canManage,
}: {
  apiKeys: ApiKey[];
  canManage: boolean;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

  const handleCreate = () => {
    if (!name.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await createApiKey(name.trim());
        setNewKey(result.key);
        setName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create key.");
      }
    });
  };

  const handleRevoke = (id: string) => {
    setError("");
    startTransition(async () => {
      try {
        await revokeApiKey(id);
        setKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to revoke key.");
      }
    });
  };

  const handleCopy = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {newKey && (
        <div className="rounded-[10px] border border-green-200 bg-green-50 p-4">
          <p className="text-[13px] font-semibold text-green-800">API key created — copy it now</p>
          <p className="mt-1 text-[12px] text-green-700">This key will not be shown again.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-[8px] border border-green-200 bg-white px-3 py-2 text-[12px] font-mono text-green-900 break-all">
              {newKey}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-[8px] border border-green-300 bg-white px-3 py-2 text-[12px] font-medium text-green-800 hover:bg-green-50"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewKey(null)}
            className="mt-3 text-[12px] text-green-600 underline"
          >
            I&apos;ve saved it, dismiss
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      {canManage && (
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. Website form)"
            className="flex-1 rounded-[10px] border border-ud bg-ud-surface px-[14px] py-[10px] text-[13.5px] text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !name.trim()}
            className="rounded-[10px] bg-ud-accent px-4 py-[10px] text-[13.5px] font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create key"}
          </button>
        </div>
      )}

      {activeKeys.length === 0 && !canManage && (
        <p className="text-[13px] text-ud-faint">No active API keys.</p>
      )}

      {activeKeys.length > 0 && (
        <div className="divide-y divide-ud rounded-[10px] border border-ud overflow-hidden">
          {activeKeys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13.5px] font-medium text-ud-ink">{k.name}</p>
                <p className="text-[12px] text-ud-faint">
                  Created {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleRevoke(k.id)}
                  disabled={isPending}
                  className="text-[12px] text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {revokedKeys.length > 0 && (
        <details className="text-[12px] text-ud-faint">
          <summary className="cursor-pointer select-none">
            {revokedKeys.length} revoked {revokedKeys.length === 1 ? "key" : "keys"}
          </summary>
          <div className="mt-2 divide-y divide-ud rounded-[10px] border border-ud overflow-hidden opacity-60">
            {revokedKeys.map((k) => (
              <div key={k.id} className="px-4 py-2">
                <span className="text-[13px] line-through text-ud-muted">{k.name}</span>
                <span className="ml-2 text-[12px] text-ud-faint">
                  Revoked {new Date(k.revoked_at!).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
