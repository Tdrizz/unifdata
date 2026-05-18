"use client";

import { useActionState } from "react";
import {
  submitWaitlistRequest,
  type WaitlistState,
} from "@/app/waitlist/actions";

const initialState: WaitlistState = {};

const companySizes = [
  "1-5 employees",
  "6-20 employees",
  "21-50 employees",
  "51-100 employees",
  "100+ employees",
];

const inputClass =
  "mt-2 w-full rounded-[10px] border border-white/15 bg-white/8 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-white/30 focus:ring-2 focus:ring-[#4A3FA8]/40";

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(
    submitWaitlistRequest,
    initialState,
  );

  if (state.ok) {
    return (
      <div className="rounded-[14px] border border-emerald-300/25 bg-emerald-400/10 p-6 text-emerald-50">
        <p className="text-lg font-semibold">Request received.</p>
        <p className="mt-2 text-sm leading-6 text-emerald-100/85">
          We&apos;ll review your company fit and follow up with pilot onboarding
          details if UnifData is a match.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          name="name"
          error={state.fieldErrors?.name}
          autoComplete="name"
        />
        <Field
          label="Work email"
          name="email"
          type="email"
          error={state.fieldErrors?.email}
          autoComplete="email"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Company"
          name="company"
          error={state.fieldErrors?.company}
          autoComplete="organization"
        />
        <div>
          <label className="text-sm font-medium text-slate-200">
            Company size
          </label>
          <select
            name="companySize"
            required
            className={inputClass + " cursor-pointer"}
            defaultValue=""
          >
            <option value="" disabled className="bg-[#0d1423] text-slate-400">
              Select size
            </option>
            {companySizes.map((size) => (
              <option key={size} value={size} className="bg-[#0d1423] text-white">
                {size}
              </option>
            ))}
          </select>
          {state.fieldErrors?.companySize && (
            <p className="mt-2 text-sm text-red-300">
              {state.fieldErrors.companySize}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-200">
          Use case or pain points
        </label>
        <textarea
          name="useCase"
          required
          rows={5}
          className={inputClass + " resize-none"}
          placeholder="Tell us what data is scattered, duplicated, or hard to act on today."
        />
        {state.fieldErrors?.useCase && (
          <p className="mt-2 text-sm text-red-300">
            {state.fieldErrors.useCase}
          </p>
        )}
      </div>

      {state.error && (
        <div className="rounded-[10px] border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[10px] bg-[#4A3FA8] px-4 py-3.5 font-semibold text-white hover:bg-[#3D3494] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Request access"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">{label}</label>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className={inputClass}
      />
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
