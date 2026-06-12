import { redirect } from "next/navigation";

// Duplicate detection now runs on master_customers via the Data Hub
// reconciliation queue.
export default function LegacyDuplicatesPage() {
  redirect("/data-hub");
}
