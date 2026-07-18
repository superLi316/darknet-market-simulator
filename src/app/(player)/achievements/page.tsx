import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AchievementsPageClient from "@/components/player/achievements-page-client";

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <AchievementsPageClient />;
}
