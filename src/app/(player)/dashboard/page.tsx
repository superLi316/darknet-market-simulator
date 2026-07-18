import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  Coins,
  Heart,
  Zap,
  Trophy,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";

const PERSONALITY_NAMES: Record<string, string> = {
  HARDWORKING: "勤奋型",
  LAZY: "懒惰型",
  SPECULATOR: "投机型",
  CAUTIOUS: "谨慎型",
  CRAZY: "疯狂型",
};

export default async function DashboardPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id },
    include: {
      _count: {
        select: {
          transactions: true,
          workRecords: true,
          trophies: true,
        },
      },
    },
  });

  if (!user) return null;

  const stats = [
    {
      label: "货币余额",
      value: user.balance.toFixed(0),
      icon: Coins,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "健康值",
      value: `${user.health}/100`,
      icon: Heart,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      label: "体力值",
      value: `${user.stamina}/${user.maxStamina}`,
      icon: Zap,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      label: "生存天数",
      value: user.survivalDays.toString(),
      icon: Calendar,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">控制台</h1>
        <p className="text-muted-foreground">
          欢迎回来，{user.username}。你的性格是{" "}
          <span className="text-cyan-400">
            {PERSONALITY_NAMES[user.personality]}
          </span>
          。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-cyan-500/20 bg-card/50">
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
        <Card className="border-cyan-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">经济概况</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">累计收入</span>
              <span className="flex items-center gap-1 text-green-400 font-mono">
                <TrendingUp className="w-4 h-4" />
                {user.totalEarned.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">累计支出</span>
              <span className="flex items-center gap-1 text-red-400 font-mono">
                <TrendingDown className="w-4 h-4" />
                {user.totalSpent.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">交易利润</span>
              <span className="font-mono">{user.totalProfit.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">交易笔数</span>
              <span className="font-mono">{user._count.transactions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">劳动次数</span>
              <span className="font-mono">{user._count.workRecords}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">奖杯收藏</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">小奖杯</span>
              <span className="flex items-center gap-1 text-cyan-400 font-mono">
                <Trophy className="w-4 h-4" />
                {user.smallTrophies}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">大奖杯</span>
              <span className="flex items-center gap-1 text-yellow-400 font-mono">
                <Trophy className="w-5 h-5" />
                {user.largeTrophies}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">奖杯总数</span>
              <span className="font-mono">{user._count.trophies}</span>
            </div>
            <div className="pt-4 border-t border-cyan-500/20">
              <p className="text-xs text-muted-foreground">
                每 100 货币可兑换一个小奖杯，5 个小奖杯合成一个大奖杯
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
