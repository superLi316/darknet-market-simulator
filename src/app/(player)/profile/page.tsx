import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/player/profile-page-client";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <ProfilePageClient />;
}
