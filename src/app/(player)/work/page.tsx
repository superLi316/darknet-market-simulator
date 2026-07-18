import { auth } from "@/auth";
import { WorkPageClient } from "@/components/player/work-page-client";
import { redirect } from "next/navigation";

export default async function WorkPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <WorkPageClient personality={session.user.personality} />;
}
