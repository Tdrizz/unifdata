export type ContactForSelect = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

// Phase 03 — result shape for the create-time duplicate-contact check
// (/api/contacts/check-duplicate). `matchedOn` tells the banner which field
// tripped the match so it can say "same email" vs "same phone number"
// instead of a vague "this looks familiar".
export type DuplicateContactMatch = ContactForSelect & {
  matchedOn: "email" | "phone";
};
