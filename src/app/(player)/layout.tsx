import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PlayerSidebar } from "@/components/player/player-sidebar";
import { redirect } from "next/navigation";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      balance: true,
      health: true,
      stamina: true,
      gameDay: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <PlayerSidebar
        username={user.username}
        balance={user.balance}
        health={user.health}
        stamina={user.stamina}
        gameDay={user.gameDay}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
