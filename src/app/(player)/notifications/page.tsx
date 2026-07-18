import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Check } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatRelativeTime } from "@/lib/utils";

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  SYSTEM: Bell,
  DEATH: Bell,
  EVENT: Bell,
  TRADE: Bell,
  WORK: Bell,
  TROPHY: Bell,
};

export default async function NotificationsPage() {
  const session = await auth();

  const notifications = await prisma.notification.findMany({
    where: { userId: session?.user?.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">通知中心</h1>
          <p className="text-muted-foreground">
            你有 {unreadCount} 条未读通知
          </p>
        </div>
        <button className="text-sm text-cyan-400 hover:underline flex items-center gap-1">
          <Check className="w-4 h-4" />
          全部标为已读
        </button>
      </div>

      <Card className="border-cyan-500/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            通知列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">暂无通知</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.isRead
                      ? "border-transparent bg-background/30"
                      : "border-cyan-500/30 bg-cyan-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {notification.content}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
