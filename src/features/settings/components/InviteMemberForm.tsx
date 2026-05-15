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
      const result = await inviteMember(email, role);
      if ("error" in result) {
        setMessage(`Error: ${result.error}`);
      } else {
        setMessage(`Invite sent to ${email}`);
        setEmail("");
      }
    });
  };

  return (
    <div className="mt-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Invite team member</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs text-slate-500">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as "member" | "owner")} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">
            <option value="member">Member</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <button type="submit" disabled={isPending} className="rounded-lg bg-[#1D2D3E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a3f57] disabled:opacity-50">
          {isPending ? "Sending…" : "Send Invite"}
        </button>
      </form>
      {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
    </div>
  );
}
