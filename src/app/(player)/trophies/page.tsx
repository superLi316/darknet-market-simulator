import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Award, Star } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export default async function TrophiesPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id },
    select: {
      smallTrophies: true,
      largeTrophies: true,
      balance: true,
    },
  });

  const smallTrophies = user?.smallTrophies || 0;
  const largeTrophies = user?.largeTrophies || 0;
  const balance = user?.balance || 0;

  const canBuySmall = balance >= 100;
  const canConvert = smallTrophies >= 5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">奖杯系统</h1>
        <p className="text-muted-foreground">
          用货币兑换奖杯，记录你的成就。大奖杯数量决定排行榜名次。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-cyan-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-cyan-400" />
              小奖杯
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-cyan-400 font-mono">
                {smallTrophies}
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              每 100 货币兑换 1 个
            </p>
            <button
              disabled={!canBuySmall}
              className="w-full py-2 rounded-md text-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              兑换小奖杯 (100 货币)
            </button>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              大奖杯
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-yellow-400 font-mono">
                {largeTrophies}
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              5 个小奖杯合成 1 个
            </p>
            <button
              disabled={!canConvert}
              className="w-full py-2 rounded-md text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              合成大奖杯
            </button>
          </CardContent>
        </Card>

        <Card className="border-magenta-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-magenta-400" />
              排行榜
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              功能开发中
              <br />
              敬请期待
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
