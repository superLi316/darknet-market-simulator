import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  Coins,
  TrendingUp,
  ShoppingCart,
  Trophy,
  Activity,
} from "lucide-react";
import { prisma } from "@/lib/db";

export default async function AdminDashboardPage() {
  const [totalUsers, aliveUsers, totalBalance, todayTrades] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ALIVE" } }),
    prisma.user.aggregate({ _sum: { balance: true } }),
    prisma.transaction.count({
      where: {
        timestamp: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  const stats = [
    {
      label: "总用户数",
      value: totalUsers.toString(),
      icon: Users,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "存活用户",
      value: aliveUsers.toString(),
      icon: UserCheck,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      label: "货币总供应量(M0)",
      value: (totalBalance._sum.balance || 0).toFixed(0),
      icon: Coins,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "今日交易笔数",
      value: todayTrades.toString(),
      icon: ShoppingCart,
      color: "text-magenta-400",
      bgColor: "bg-magenta-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">数据大盘</h1>
        <p className="text-muted-foreground">
          实时监控游戏经济系统的整体健康状况。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-red-500/20 bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono ${stat.color}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-400" />
              七日交易趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              图表开发中...
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              性格分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              图表开发中...
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              商品交易热力图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              图表开发中...
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              奖杯等级分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              图表开发中...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
