import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LeaderboardPageClient from "@/components/player/leaderboard-page-client";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <LeaderboardPageClient />;
}
