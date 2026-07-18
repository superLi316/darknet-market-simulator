"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Loader2,
  Lock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Briefcase,
  TrendingUp,
  Heart,
  Zap,
  Award,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AchievementCondition {
  field: string;
  operator: string;
  value: number;
}

interface AchievementTitle {
  id: string;
  name: string;
  buffType: string;
  buffValue: number;
}

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  condition: AchievementCondition;
  isCompleted: boolean;
  completedAt: string | null;
  progress: number;
  title?: AchievementTitle;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: typeof Briefcase; color: string }
> = {
  WORK: { label: "劳动", icon: Briefcase, color: "text-yellow-400" },
  TRADE: { label: "交易", icon: TrendingUp, color: "text-green-400" },
  SURVIVAL: { label: "生存", icon: Heart, color: "text-red-400" },
  SKILL: { label: "技能", icon: Zap, color: "text-cyan-400" },
  TROPHY: { label: "奖杯", icon: Award, color: "text-purple-400" },
  SPECIAL: { label: "特殊", icon: Sparkles, color: "text-orange-400" },
};

const CATEGORY_ORDER = ["WORK", "TRADE", "SURVIVAL", "SKILL", "TROPHY", "SPECIAL"];

const CONDITION_FIELD_LABELS: Record<string, string> = {
  workCount: "劳动次数",
  tradeCount: "交易次数",
  survivalDays: "存活天数",
  totalEarned: "累计赚取",
  skillCount: "技能数量",
  totalTrophies: "奖杯总数",
};

const BUFF_TYPE_LABELS: Record<string, string> = {
  EARNINGS_BOOST: "劳动收益加成",
  TRADE_BOOST: "交易收益加成",
  CRIT_BOOST: "暴击率加成",
  STAMINA_MAX: "体力上限加成",
  HEALTH_MAX: "健康上限加成",
};

function formatBuffValue(buffType: string, buffValue: number): string {
  if (
    buffType === "EARNINGS_BOOST" ||
    buffType === "TRADE_BOOST" ||
    buffType === "CRIT_BOOST"
  ) {
    return `+${(buffValue * 100).toFixed(0)}%`;
  }
  return `+${buffValue}`;
}

export default function AchievementsPageClient() {
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/achievements");
      const json = await res.json();
      if (json.code === 200) {
        setAchievements(json.data.achievements || []);
      } else {
        setError(json.message || "获取成就列表失败");
      }
    } catch (e) {
      console.error("加载成就列表失败", e);
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
    toast({ title: "成就列表已刷新" });
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

  // 按分类分组
  const grouped: Record<string, Achievement[]> = {};
  for (const ach of achievements) {
    if (!grouped[ach.category]) grouped[ach.category] = [];
    grouped[ach.category].push(ach);
  }

  const completedCount = achievements.filter((a) => a.isCompleted).length;
  const totalCount = achievements.length;
  const overallProgress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">成就系统</h1>
          <p className="text-muted-foreground">
            达成成就可解锁对应头衔，前往头衔页面激活以获得 buff 加成。
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

      {/* 总进度概览 */}
      <Card className="border-cyan-500/20 bg-card/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-cyan-400" />
              <span className="font-medium">总进度</span>
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              {completedCount} / {totalCount}
            </span>
          </div>
          <div className="h-2 bg-background/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">
            完成度 {overallProgress}%
          </p>
        </CardContent>
      </Card>

      {achievements.length === 0 ? (
        <Card className="border-cyan-500/20 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Trophy className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">暂无成就数据</p>
          </CardContent>
        </Card>
      ) : (
        CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((category) => {
          const config = CATEGORY_CONFIG[category];
          const CatIcon = config?.icon || Trophy;
          const list = grouped[category];
          const catCompleted = list.filter((a) => a.isCompleted).length;

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <CatIcon className={`w-5 h-5 ${config?.color}`} />
                <h2 className="text-lg font-semibold">{config?.label || category}</h2>
                <span className="text-sm text-muted-foreground font-mono">
                  ({catCompleted}/{list.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((ach) => (
                  <AchievementCard key={ach.id} achievement={ach} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { isCompleted, progress, condition } = achievement;
  const fieldLabel =
    CONDITION_FIELD_LABELS[condition.field] || condition.field;
  const buffLabel = achievement.title
    ? BUFF_TYPE_LABELS[achievement.title.buffType]
    : null;
  const buffValueText = achievement.title
    ? formatBuffValue(achievement.title.buffType, achievement.title.buffValue)
    : null;

  // 进度条：已完成显示 100%，未完成显示 0%（API 仅在完成时记录 progress）
  const progressBar = isCompleted ? 100 : 0;

  return (
    <Card
      className={`bg-card/50 transition-all hover:shadow-lg ${
        isCompleted
          ? "border-green-500/40"
          : "border-cyan-500/10 opacity-90 hover:opacity-100"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            ) : (
              <Lock className="w-5 h-5 text-gray-500 flex-shrink-0" />
            )}
            <CardTitle
              className={`text-base truncate ${
                isCompleted ? "text-green-400" : "text-muted-foreground"
              }`}
            >
              {achievement.name}
            </CardTitle>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {achievement.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 目标 */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">目标</span>
          <span className="font-mono">
            {fieldLabel} {condition.operator} {condition.value}
          </span>
        </div>

        {/* 进度条 */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">进度</span>
            <span
              className={`font-mono ${
                isCompleted ? "text-green-400" : "text-muted-foreground"
              }`}
            >
              {progressBar}%
            </span>
          </div>
          <div className="h-1.5 bg-background/70 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isCompleted
                  ? "bg-gradient-to-r from-green-500 to-emerald-400"
                  : "bg-gray-600"
              }`}
              style={{ width: `${progressBar}%` }}
            />
          </div>
        </div>

        {/* 关联头衔 */}
        {achievement.title && (
          <div className="pt-2 border-t border-cyan-500/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">解锁头衔</span>
              <span className="text-purple-400 font-medium">
                {achievement.title.name}
              </span>
            </div>
            {buffLabel && buffValueText && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">Buff 效果</span>
                <span className="text-cyan-400 font-mono">
                  {buffValueText} {buffLabel}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 完成时间 */}
        {isCompleted && achievement.completedAt ? (
          <div className="pt-2 border-t border-cyan-500/10">
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>
                完成于{" "}
                {new Date(achievement.completedAt).toLocaleString("zh-CN")}
              </span>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-cyan-500/10">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="w-3 h-3" />
              <span>未完成</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
