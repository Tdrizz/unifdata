/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export type SmartGroupRule = {
  field: string;
  operator: "is" | "is_not" | "contains" | "gt" | "lt" | "is_blank" | "is_not_blank";
  value?: string;
};

export async function evaluateSmartGroup(
  groupId: string,
  orgId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  // Fetch the smart group rules
  const { data: group, error } = await (supabase as any)
    .from("smart_groups")
    .select("rules, match_type")
    .eq("id", groupId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error || !group) return [];

  const rules: SmartGroupRule[] = Array.isArray(group.rules) ? group.rules : [];
  if (rules.length === 0) {
    // No rules — return all contacts for org
    const { data } = await (supabase as any)
      .from("master_customers")
      .select("id")
      .eq("organization_id", orgId);
    return (data ?? []).map((r: { id: string }) => r.id);
  }

  // Fetch all contacts for the org, then filter in JS
  // For a production system this would build SQL, but for now we filter in memory
  const { data: contacts } = await (supabase as any)
    .from("master_customers")
    .select("id, relationship_status, source, primary_phone, email, created_at")
    .eq("organization_id", orgId);

  if (!contacts) return [];

  const matchType: "all" | "any" = group.match_type === "any" ? "any" : "all";

  const matchingIds: string[] = [];

  for (const contact of contacts) {
    const results = await Promise.all(
      rules.map((rule) => evaluateRule(rule, contact, orgId, supabase))
    );

    const matches =
      matchType === "all"
        ? results.every(Boolean)
        : results.some(Boolean);

    if (matches) matchingIds.push(contact.id);
  }

  // Update contact_count on the group
  await (supabase as any)
    .from("smart_groups")
    .update({ contact_count: matchingIds.length, last_evaluated: new Date().toISOString() })
    .eq("id", groupId);

  return matchingIds;
}

async function evaluateRule(
  rule: SmartGroupRule,
  contact: Record<string, unknown>,
  orgId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { field, operator, value } = rule;

  // Handle special computed fields
  if (field === "tag") {
    const { data: tagRows } = await (supabase as any)
      .from("contact_tags")
      .select("tags(name)")
      .eq("contact_id", contact.id);

    const tagNames: string[] = (tagRows ?? []).map(
      (r: { tags: { name: string } | null }) => r.tags?.name ?? ""
    );

    if (operator === "is") return tagNames.includes(value ?? "");
    if (operator === "is_not") return !tagNames.includes(value ?? "");
    if (operator === "is_blank") return tagNames.length === 0;
    if (operator === "is_not_blank") return tagNames.length > 0;
    return false;
  }

  if (field === "days_since_activity") {
    const { data: latest } = await (supabase as any)
      .from("contact_activity")
      .select("created_at")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) {
      if (operator === "is_blank") return true;
      return false;
    }

    const days = Math.floor(
      (Date.now() - new Date(latest.created_at as string).getTime()) / 86400000
    );

    if (operator === "gt") return days > Number(value ?? 0);
    if (operator === "lt") return days < Number(value ?? 0);
    if (operator === "is") return days === Number(value ?? 0);
    return false;
  }

  if (field === "lifetime_value") {
    const { data: sales } = await (supabase as any)
      .from("sales")
      .select("amount")
      .eq("customer_id", contact.id);

    const total = (sales ?? []).reduce(
      (sum: number, s: { amount: number | null }) => sum + (s.amount ?? 0),
      0
    );

    if (operator === "gt") return total > Number(value ?? 0);
    if (operator === "lt") return total < Number(value ?? 0);
    if (operator === "is") return total === Number(value ?? 0);
    return false;
  }

  // Simple fields: relationship_status, source
  const fieldValue = contact[field as keyof typeof contact] as string | null | undefined;

  if (operator === "is_blank") return fieldValue == null || fieldValue === "";
  if (operator === "is_not_blank") return fieldValue != null && fieldValue !== "";
  if (operator === "is") return fieldValue === value;
  if (operator === "is_not") return fieldValue !== value;
  if (operator === "contains") return (fieldValue ?? "").toLowerCase().includes((value ?? "").toLowerCase());

  return false;
}
