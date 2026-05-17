"use client";
import { useState, useTransition } from "react";
import { inviteMember } from "../actions";

export function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "owner">("member");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await inviteMember(email, role);
        if ("error" in result) {
          setMessage(`Error: ${(result as { error: string }).error}`);
        } else {
          setMessage(`Invite sent to ${email}`);
          setEmail("");
        }
      } catch (err) {
        setMessage(`Error: ${err instanceof Error ? err.message : "Failed to send invite."}`);
      }
    });
  };

  return (
    <div className="mt-4">
      <p className="mb-3 text-[13px] font-semibold text-ud-ink">Invite team member</p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-[11px] font-medium text-ud-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="w-full rounded-[10px] border border-ud bg-ud-surface px-[14px] py-[10px] text-[13.5px] text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-ud-muted">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "owner")}
            className="rounded-[10px] border border-ud bg-ud-surface px-[14px] py-[10px] text-[13.5px] text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20"
          >
            <option value="member">Member</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[10px] bg-ud-ink px-[16px] py-[9px] text-[13.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send Invite"}
        </button>
      </form>
      {message && <p className="mt-2 text-[13px] text-ud-muted">{message}</p>}
    </div>
  );
}
