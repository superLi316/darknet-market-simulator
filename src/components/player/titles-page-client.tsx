"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Star,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlayerTitle {
  id: string;
  titleId: string;
  code: string;
  name: string;
  description: string;
  buffType: string;
  buffValue: number;
  rarity: number;
  isActive: boolean;
  acquiredAt: string;
}

interface TitlesData {
  titles: PlayerTitle[];
  activeTitleId: string | null;
}

const RARITY_CONFIG: Record<
  number,
  { label: string; starColor: string; borderColor: string; glowColor: string }
> = {
  1: {
    label: "普通",
    starColor: "text-gray-400",
    borderColor: "border-gray-500/30",
    glowColor: "shadow-gray-500/20",
  },
  2: {
    label: "精良",
    starColor: "text-green-400",
    borderColor: "border-green-500/40",
    glowColor: "shadow-green-500/20",
  },
  3: {
    label: "稀有",
    starColor: "text-blue-400",
    borderColor: "border-blue-500/40",
    glowColor: "shadow-blue-500/20",
  },
  4: {
    label: "史诗",
    starColor: "text-purple-400",
    borderColor: "border-purple-500/40",
    glowColor: "shadow-purple-500/20",
  },
  5: {
    label: "传说",
    starColor: "text-yellow-400",
    borderColor: "border-yellow-500/50",
    glowColor: "shadow-yellow-500/20",
  },
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

export default function TitlesPageClient() {
  const { toast } = useToast();
  const [data, setData] = useState<TitlesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/titles");
      const json = await res.json();
      if (json.code === 200) {
        setData(json.data);
      } else {
        setError(json.message || "获取头衔列表失败");
      }
    } catch (e) {
      console.error("加载头衔列表失败", e);
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
    toast({ title: "头衔列表已刷新" });
  }

  async function handleActivate(titleId: string, titleName: string) {
    setActivatingId(titleId);
    try {
      const res = await fetch("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleId }),
      });
      const json = await res.json();

      if (json.code === 200) {
        toast({
          title: "头衔激活成功",
          description: `已激活头衔「${titleName}」`,
        });
        loadData();
      } else {
        toast({
          title: "激活失败",
          description: json.message,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setActivatingId(null);
    }
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

  const titles = data?.titles || [];
  const activeTitleId = data?.activeTitleId;
  const activeCount = titles.filter((t) => t.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">头衔系统</h1>
          <p className="text-muted-foreground">
            激活头衔可获得对应 buff 加成。同时只能激活一个头衔，请根据策略选择。
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

      {/* 提示信息 */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
        <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-purple-300">
          同时只能激活一个头衔。激活新头衔将自动取消之前已激活的头衔。
          {activeCount > 0 && (
            <span className="ml-1 font-medium">
              当前已激活 {activeCount} 个。
            </span>
          )}
        </p>
      </div>

      {titles.length === 0 ? (
        <Card className="border-cyan-500/20 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Star className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">暂未获得任何头衔</p>
            <p className="text-sm mt-1">完成成就即可解锁对应头衔</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {titles.map((title) => (
            <TitleCard
              key={title.id}
              title={title}
              activating={activatingId === title.titleId}
              onActivate={() => handleActivate(title.titleId, title.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TitleCard({
  title,
  activating,
  onActivate,
}: {
  title: PlayerTitle;
  activating: boolean;
  onActivate: () => void;
}) {
  const rarity = Math.min(Math.max(title.rarity, 1), 5);
  const rarityConfig = RARITY_CONFIG[rarity];
  const buffLabel = BUFF_TYPE_LABELS[title.buffType] || title.buffType;
  const buffValueText = formatBuffValue(title.buffType, title.buffValue);
  const isActive = title.isActive;

  return (
    <Card
      className={`bg-card/50 transition-all hover:shadow-lg ${
        isActive
          ? "border-purple-500/60 shadow-lg shadow-purple-500/20"
          : rarityConfig.borderColor
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle
              className={`text-base truncate ${
                isActive ? "text-purple-400" : ""
              }`}
            >
              {title.name}
            </CardTitle>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: rarity }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 fill-current ${rarityConfig.starColor}`}
                />
              ))}
              <span className={`text-xs ml-1 ${rarityConfig.starColor}`}>
                {rarityConfig.label}
              </span>
            </div>
          </div>
          {isActive && (
            <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex-shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              已激活
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {title.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Buff 效果 */}
        <div className="p-3 rounded-lg bg-background/50 border border-cyan-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-muted-foreground">Buff 效果</span>
            </div>
            <span className="text-xs text-muted-foreground">{buffLabel}</span>
          </div>
          <p className="font-mono font-bold text-cyan-400 mt-1">
            {buffValueText}
          </p>
        </div>

        {/* 获取时间 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>获得时间</span>
          <span>{new Date(title.acquiredAt).toLocaleDateString("zh-CN")}</span>
        </div>

        {/* 操作按钮 */}
        {isActive ? (
          <Button disabled className="w-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            当前已激活
          </Button>
        ) : (
          <Button
            onClick={onActivate}
            disabled={activating}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
          >
            {activating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                激活中...
              </>
            ) : (
              "激活头衔"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
