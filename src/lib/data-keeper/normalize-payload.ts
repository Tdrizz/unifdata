import { normalizePhone, normalizeEmail } from "@/lib/normalize";
import { parseName } from "./name-parser";
import { normalizeBusinessName } from "./business-normalizer";
import { extractMetadata } from "./metadata-extractor";
import type { InboundPayload, NormalizedPayload } from "./types";

// Enhanced email normalization — extends base normalizeEmail with Gmail-specific rules.
function normalizeEmailEnhanced(raw: string | undefined | null): string | null {
  const base = normalizeEmail(raw);
  if (!base) return null;

  const [localRaw, domain] = base.split("@");
  if (!domain) return null;

  const gmailDomains = new Set(["gmail.com", "googlemail.com"]);
  if (gmailDomains.has(domain)) {
    // Strip plus-addressing: john+work → john
    const local = localRaw.split("+")[0];
    // Strip dots: john.doe → johndoe
    return `${local.replace(/\./g, "")}@${domain}`;
  }

  return base;
}

// Enhanced phone normalization — strips extensions before normalizing.
function normalizePhoneEnhanced(
  raw: string | undefined | null,
): { phone: string | null; ext: string | null } {
  if (!raw) return { phone: null, ext: null };

  // Extract extension before digit normalization
  const extMatch = raw.match(/(?:ext|extension|x)\s*\.?\s*(\d{1,6})/i);
  const ext = extMatch?.[1] ?? null;

  // Strip extension from raw before normalizing
  const stripped = raw.replace(/(?:ext|extension|x)\s*\.?\s*\d{1,6}/i, "").trim();
  const phone = normalizePhone(stripped);

  return { phone, ext };
}

export function normalizePayload(payload: InboundPayload): NormalizedPayload {
  // Resolve name from firstName/lastName or fullName
  let firstName: string | null = null;
  let lastName: string | null = null;

  if (payload.firstName || payload.lastName) {
    firstName = payload.firstName?.trim() || null;
    lastName = payload.lastName?.trim() || null;
  } else if (payload.fullName) {
    const parsed = parseName(payload.fullName);
    firstName = parsed.firstName;
    lastName = parsed.lastName;
  }

  // Build a comparable full name string
  const fullName = [firstName, lastName].filter(Boolean).join(" ").toLowerCase();

  // Normalize email (with Gmail enhancement)
  const email = normalizeEmailEnhanced(payload.email);

  // Normalize phone (with extension extraction)
  const { phone, ext } = normalizePhoneEnhanced(payload.phone);

  // Normalize business name
  const businessName = payload.businessName?.trim() || null;
  const normalizedBusinessName = businessName
    ? normalizeBusinessName(businessName)
    : null;

  // Extract structured metadata from notes
  const extractedMetadata = extractMetadata(payload.notes);
  if (ext) extractedMetadata.phone_ext = ext;

  return {
    firstName,
    lastName,
    businessName,
    email,
    phone,
    fullName,
    normalizedBusinessName,
    extractedMetadata,
  };
}
