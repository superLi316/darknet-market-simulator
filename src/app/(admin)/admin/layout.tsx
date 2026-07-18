import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar username={session.user.username} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
