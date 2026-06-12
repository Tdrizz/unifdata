import { redirect } from "next/navigation";

export default async function ContactEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/customers/${id}/edit`);
}
