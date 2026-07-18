import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TitlesPageClient from "@/components/player/titles-page-client";

export default async function TitlesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <TitlesPageClient />;
}
