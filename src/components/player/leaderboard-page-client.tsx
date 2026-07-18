"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  RefreshCw,
  Loader2,
  Crown,
  Medal,
  Award,
  User,
  Coins,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeaderboardEntry {
  id: string;
  username: string;
  balance: number;
  smallTrophies: number;
  largeTrophies: number;
  totalAssets: number;
  rank: number;
  isNpc: boolean;
  isCurrentUser: boolean;
  titleName: string | null;
  titleRarity: number | null;
}

interface LeaderboardResult {
  rankings: LeaderboardEntry[];
  currentUserRank?: LeaderboardEntry;
  total: number;
}

const TOP_RANK_STYLES: Record<
  number,
  { text: string; bg: string; border: string; icon: typeof Crown }
> = {
  1: {
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/50",
    icon: Crown,
  },
  2: {
    text: "text-gray-300",
    bg: "bg-gray-400/10",
    border: "border-gray-400/50",
    icon: Medal,
  },
  3: {
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/50",
    icon: Award,
  },
};

const TITLE_RARITY_COLORS: Record<number, string> = {
  1: "text-gray-400",
  2: "text-green-400",
  3: "text-blue-400",
  4: "text-purple-400",
  5: "text-yellow-400",
};

export default function LeaderboardPageClient() {
  const { toast } = useToast();
  const [data, setData] = useState<LeaderboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/leaderboard");
      const json = await res.json();
      if (json.code === 200) {
        setData(json.data);
      } else {
        setError(json.message || "获取排行榜失败");
      }
    } catch (e) {
      console.error("加载排行榜失败", e);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleRefresh() {
    setRefreshing(true);
    loadData();
    toast({ title: "排行榜已刷新" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4 text-red-400 opacity-70" />
        <p className="text-lg mb-4">{error}</p>
        <Button
          onClick={loadData}
          className="bg-cyan-500 hover:bg-cyan-600 text-black"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>
    );
  }

  const rankings = data?.rankings || [];
  const currentUserRank = data?.currentUserRank;
  const total = data?.total || 0;

  // 判断当前玩家是否已在前 200 名列表中展示
  const isCurrentUserInList = rankings.some((r) => r.isCurrentUser);
  const showBottomRank =
    currentUserRank && (!isCurrentUserInList || currentUserRank.rank > 200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">财富排行榜</h1>
          <p className="text-muted-foreground">
            按总资产（余额 + 奖杯价值）降序排列，共 {total} 名玩家参与排名。
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-cyan-500/30 hover:bg-cyan-500/10"
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          刷新
        </Button>
      </div>

      <Card className="border-cyan-500/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-400" />
            前 {rankings.length} 名
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Trophy className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">暂无排行数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-500/20">
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium w-20">
                      排名
                    </th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">
                      用户名
                    </th>
                    <th className="text-right py-3 px-3 text-muted-foreground font-medium">
                      总资产
                    </th>
                    <th className="text-right py-3 px-3 text-muted-foreground font-medium hidden sm:table-cell">
                      余额
                    </th>
                    <th className="text-right py-3 px-3 text-muted-foreground font-medium hidden sm:table-cell">
                      奖杯
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((entry) => {
                    const topStyle = TOP_RANK_STYLES[entry.rank];
                    const TopIcon = topStyle?.icon;
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-cyan-500/5 transition-colors ${
                          entry.isCurrentUser
                            ? "bg-purple-500/10 border-l-4 border-l-purple-500"
                            : topStyle
                            ? `${topStyle.bg} ${topStyle.border} border-l-4`
                            : "hover:bg-cyan-500/5"
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {TopIcon ? (
                              <TopIcon
                                className={`w-5 h-5 ${topStyle.text}`}
                              />
                            ) : (
                              <span className="font-mono text-muted-foreground w-5 text-center">
                                {entry.rank}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                entry.isCurrentUser
                                  ? "text-purple-400"
                                  : "text-cyan-400"
                              }`}
                            >
                              {entry.username}
                            </span>
                            {entry.titleName && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded border ${
                                  TITLE_RARITY_COLORS[entry.titleRarity || 1] || "text-gray-400"
                                } bg-white/5 border-current/20`}
                              >
                                {entry.titleName}
                              </span>
                            )}
                            {entry.isCurrentUser && (
                              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                你
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-mono font-bold ${
                              entry.isCurrentUser
                                ? "text-purple-400"
                                : topStyle
                                ? topStyle.text
                                : "text-yellow-400"
                            }`}
                          >
                            {entry.totalAssets.toFixed(0)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1">
                            <Coins className="w-3 h-3 opacity-60" />
                            {entry.balance.toFixed(0)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right hidden sm:table-cell">
                          <span className="font-mono text-sm">
                            <span className="text-yellow-400">
                              大{entry.largeTrophies}
                            </span>
                            <span className="text-muted-foreground mx-1">/</span>
                            <span className="text-cyan-400">
                              小{entry.smallTrophies}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showBottomRank && currentUserRank && (
        <Card className="border-purple-500/40 bg-purple-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">你的排名</p>
                  <p className="text-lg font-bold text-purple-400">
                    第 {currentUserRank.rank} 名
                    {currentUserRank.titleName && (
                      <span className={`text-xs ml-2 px-1.5 py-0.5 rounded border ${TITLE_RARITY_COLORS[currentUserRank.titleRarity || 1]} bg-white/5 border-current/20`}>
                        {currentUserRank.titleName}
                      </span>
                    )}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      / 共 {total} 名
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">总资产</p>
                  <p className="font-mono font-bold text-yellow-400">
                    {currentUserRank.totalAssets.toFixed(0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">余额</p>
                  <p className="font-mono text-cyan-400">
                    {currentUserRank.balance.toFixed(0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">奖杯</p>
                  <p className="font-mono text-sm">
                    <span className="text-yellow-400">
                      大{currentUserRank.largeTrophies}
                    </span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-cyan-400">
                      小{currentUserRank.smallTrophies}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
