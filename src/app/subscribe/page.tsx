import { redirect } from "next/navigation";
import { requireAppUser } from "@/lib/auth/session";
import { SubscribeForm } from "./SubscribeForm";

export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const user = await requireAppUser();

  if (user.subscribed) {
    redirect("/onboarding");
  }

  return <SubscribeForm userEmail={user.email} />;
}
