import { redirect } from "next/navigation";

export default async function LoginPage() {
  redirect("/sign-in");
}
