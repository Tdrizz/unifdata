import { redirect } from "next/navigation";

// The legacy customers list has been replaced by /contacts (master_customers).
export default function LegacyCustomersPage() {
  redirect("/contacts");
}
