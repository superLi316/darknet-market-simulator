"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Store,
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  DollarSign,
  Loader2,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BookOpen,
  Lock,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MARKET_REFRESH_CONFIG } from "@/types";

interface MarketItem {
  id: string;
  name: string;
  description: string;
  category: string;
  currentPrice: number;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  priceHint: string;
  priceTrend: "up" | "down" | "neutral";
  priceRatio: number;
  changePercent: number;
  // 消耗品属性
  buffType?: string | null;
  buffValue?: number | null;
  buffDuration?: number | null;
  healthEffect?: number;
  staminaEffect?: number;
}

interface InventoryItem {
  itemId: string;
  item: MarketItem;
  totalQuantity: number;
  averageBuyPrice: number;
  totalCost: number;
  currentValue: number;
  profitLoss: number;
  profitPercent: number;
}

interface FreeStory {
  id: string;
  storyText: string;
  hintType: string;
  itemId: string | null;
  itemName: string | null;
  gameDay: number;
  isPremium: false;
  priceImpact: number;
}

interface PremiumStory {
  id: string;
  storyText: null;
  hintType: null;
  itemId: null;
  itemName: null;
  gameDay: number;
  isPremium: true;
  priceImpact: null;
  cost: number;
  teaser: string;
}

interface PurchasedStory {
  id: string;
  storyText: string;
  hintType: string;
  itemId: string | null;
  itemName: string | null;
  priceImpact: number;
  gameDay: number;
}

interface RefreshInfo {
  cost: number;
  marketRefreshCount: number;
  remainingBalance: number;
  nextRefreshCost: number;
  canRefreshAgain: boolean;
}

const categoryNames: Record<string, string> = {
  CONSUMABLE: "消耗品",
  SKILL_CHIP: "技能芯片",
  COMMODITY: "商品",
};

const CATEGORIES = [
  { value: "", label: "全部" },
  { value: "CONSUMABLE", label: "消耗品" },
  { value: "COMMODITY", label: "商品" },
  { value: "SKILL_CHIP", label: "技能芯片" },
];

const buffTypeNames: Record<string, string> = {
  STAMINA_RECOVER: "恢复体力",
  HEALTH_RECOVER: "恢复健康",
  HEALTH_DAMAGE: "损失健康",
  STAMINA_MAX: "增加体力上限",
  EARNINGS_BOOST: "劳动收益加成",
  TRADE_BOOST: "交易利润加成",
  CRIT_BOOST: "暴击率加成",
};

const hintTypeNames: Record<string, string> = {
  PRICE_UP: "看涨",
  PRICE_DOWN: "看跌",
  DEMAND_UP: "需求增加",
  DEMAND_DOWN: "需求减少",
};

// 计算指定刷新次数下的费用
function calcRefreshCost(refreshCount: number): number {
  return (
    Math.round(
      MARKET_REFRESH_CONFIG.BASE_COST *
        Math.pow(MARKET_REFRESH_CONFIG.COST_MULTIPLIER, refreshCount) *
        100
    ) / 100
  );
}

// 获取消耗品的 buff 效果说明
function getBuffDescription(item: MarketItem): string {
  if (item.category !== "CONSUMABLE" || !item.buffType) return "";
  const parts: string[] = [];
  const value = item.buffValue || 0;

  switch (item.buffType) {
    case "STAMINA_RECOVER":
      parts.push(`恢复体力 +${value}`);
      break;
    case "HEALTH_RECOVER":
      parts.push(`恢复健康 +${value}`);
      break;
    case "HEALTH_DAMAGE":
      parts.push(`损失健康 -${value}`);
      break;
    case "STAMINA_MAX":
      parts.push(`永久增加体力上限 +${value}`);
      break;
    case "EARNINGS_BOOST":
      parts.push(
        `劳动收益 +${(value * 100).toFixed(0)}% 持续 ${item.buffDuration || 0} 分钟`
      );
      break;
    case "TRADE_BOOST":
      parts.push(
        `交易利润 +${(value * 100).toFixed(0)}% 持续 ${item.buffDuration || 0} 分钟`
      );
      break;
    case "CRIT_BOOST":
      parts.push(
        `暴击率 +${(value * 100).toFixed(0)}% 持续 ${item.buffDuration || 0} 分钟`
      );
      break;
  }

  if (item.healthEffect && item.healthEffect !== 0) {
    parts.push(
      `健康 ${item.healthEffect > 0 ? "+" : ""}${item.healthEffect}`
    );
  }
  if (item.staminaEffect && item.staminaEffect !== 0) {
    parts.push(
      `体力 ${item.staminaEffect > 0 ? "+" : ""}${item.staminaEffect}`
    );
  }
  return parts.join("，");
}

export function MarketPageClient() {
  const { toast } = useToast();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tradeDialog, setTradeDialog] = useState<{
    item: MarketItem | null;
    type: "buy" | "sell";
  }>({ item: null, type: "buy" });
  const [quantity, setQuantity] = useState(1);
  const [trading, setTrading] = useState(false);
  const [balance, setBalance] = useState(0);

  // 市场故事
  const [freeStories, setFreeStories] = useState<FreeStory[]>([]);
  const [premiumStories, setPremiumStories] = useState<PremiumStory[]>([]);
  const [purchasedStories, setPurchasedStories] = useState<
    Record<string, PurchasedStory>
  >({});
  const [gameDay, setGameDay] = useState(1);
  const [buyingStoryId, setBuyingStoryId] = useState<string | null>(null);

  // 刷新市场
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    loadStories();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [itemsRes, invRes, userRes] = await Promise.all([
        fetch(`/api/market/items${selectedCategory ? `?category=${selectedCategory}` : ""}`),
        fetch("/api/inventory"),
        fetch("/api/user/me"),
      ]);

      const itemsData = await itemsRes.json();
      const invData = await invRes.json();
      const userData = await userRes.json();

      if (itemsData.code === 200) setItems(itemsData.data);
      if (invData.code === 200) setInventory(invData.data.items || []);
      if (userData.code === 200) setBalance(userData.data.balance);
    } catch (error) {
      console.error("加载市场数据失败", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStories() {
    try {
      const res = await fetch("/api/market/stories");
      const data = await res.json();
      if (data.code === 200) {
        setFreeStories(data.data.freeStories || []);
        setPremiumStories(data.data.premiumStories || []);
        setGameDay(data.data.gameDay || 1);
      }
    } catch (error) {
      console.error("加载市场故事失败", error);
    }
  }

  async function handleRefresh() {
    const cost = calcRefreshCost(refreshCount);
    if (balance < cost) {
      toast({
        title: "余额不足",
        description: `刷新市场需要 ${cost.toFixed(0)} 货币，当前余额 ${balance.toFixed(0)}`,
        variant: "destructive",
      });
      return;
    }

    setRefreshing(true);
    try {
      const res = await fetch("/api/market/refresh", { method: "POST" });
      const data = await res.json();

      if (data.code === 200) {
        const info: RefreshInfo = data.data;
        setRefreshCount(info.marketRefreshCount);
        setBalance(info.remainingBalance);
        toast({
          title: "市场已刷新",
          description: `花费 ${info.cost.toFixed(0)} 货币，今日已刷新 ${info.marketRefreshCount} 次。下次刷新需 ${info.nextRefreshCost.toFixed(0)} 货币。`,
        });
        loadData();
        loadStories();
      } else {
        toast({
          title: "刷新失败",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleBuyStory(storyId: string) {
    setBuyingStoryId(storyId);
    try {
      const res = await fetch("/api/market/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });
      const data = await res.json();

      if (data.code === 200) {
        const story = data.data.story as PurchasedStory;
        setPurchasedStories((prev) => ({ ...prev, [storyId]: story }));
        if (typeof data.data.cost === "number" && data.data.cost > 0) {
          setBalance(data.data.remainingBalance);
        }
        toast({
          title: "情报已解锁",
          description:
            data.data.cost > 0
              ? `花费 ${data.data.cost} 货币解锁了一条加密情报`
              : "该情报已解锁，无需重复付费",
        });
      } else {
        toast({
          title: "购买失败",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setBuyingStoryId(null);
    }
  }

  function getInventoryQuantity(itemId: string): number {
    const inv = inventory.find((i) => i.itemId === itemId);
    return inv?.totalQuantity || 0;
  }

  function openBuyDialog(item: MarketItem) {
    setTradeDialog({ item, type: "buy" });
    setQuantity(1);
  }

  function openSellDialog(item: MarketItem) {
    setTradeDialog({ item, type: "sell" });
    setQuantity(1);
  }

  async function handleTrade() {
    if (!tradeDialog.item) return;

    setTrading(true);
    try {
      const endpoint = tradeDialog.type === "buy" ? "/api/market/buy" : "/api/market/sell";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: tradeDialog.item.id,
          quantity,
        }),
      });
      const data = await res.json();

      if (data.code === 200) {
        toast({
          title: tradeDialog.type === "buy" ? "购买成功！" : "出售成功！",
          description:
            tradeDialog.type === "buy"
              ? `花费 ${data.data.totalCost.toFixed(0)} 货币购买了 ${quantity} 个 ${tradeDialog.item.name}`
              : `获得 ${data.data.totalRevenue.toFixed(0)} 货币，利润 ${data.data.totalProfit.toFixed(0)} (${data.data.profitPercent.toFixed(1)}%)`,
        });
        setTradeDialog({ item: null, type: "buy" });
        loadData();
      } else {
        toast({
          title: tradeDialog.type === "buy" ? "购买失败" : "出售失败",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setTrading(false);
    }
  }

  const totalCost = tradeDialog.item ? tradeDialog.item.currentPrice * quantity : 0;
  const inventoryQty = tradeDialog.item ? getInventoryQuantity(tradeDialog.item.id) : 0;

  const filteredItems = selectedCategory
    ? items.filter((i) => i.category === selectedCategory)
    : items;

  const nextRefreshCost = calcRefreshCost(refreshCount);
  const reachedMaxRefresh = refreshCount >= MARKET_REFRESH_CONFIG.MAX_DAILY_REFRESH;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">黑市交易</h1>
          <p className="text-muted-foreground">
            低买高卖，在价格波动中寻找套利机会。市场有风险，入市需谨慎。
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">当前货币</p>
            <p className="text-xl font-bold text-yellow-400 font-mono flex items-center gap-1">
              <DollarSign className="w-5 h-5" />
              {balance.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* 市场故事 */}
      <Card className="border-purple-500/30 bg-card/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-purple-300">
            <BookOpen className="w-5 h-5" />
            市场情报
            <span className="text-xs text-muted-foreground font-normal ml-2">
              第 {gameDay} 游戏日
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {freeStories.length === 0 && premiumStories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              暂无市场情报
            </p>
          ) : null}

          {/* 免费故事 */}
          {freeStories.map((story) => {
            const isUp = story.hintType === "PRICE_UP";
            return (
              <div
                key={story.id}
                className="p-3 rounded-lg bg-background/50 border border-cyan-500/20 flex items-start gap-3"
              >
                <div
                  className={`p-2 rounded-md ${
                    isUp
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        isUp
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {hintTypeNames[story.hintType] || story.hintType}
                    </span>
                    {story.itemName && (
                      <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                        {story.itemName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      影响系数 x{story.priceImpact.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{story.storyText}</p>
                </div>
              </div>
            );
          })}

          {/* 付费故事 */}
          {premiumStories.map((story) => {
            const purchased = purchasedStories[story.id];
            if (purchased) {
              const isUp = purchased.hintType === "PRICE_UP";
              return (
                <div
                  key={story.id}
                  className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/30 flex items-start gap-3"
                >
                  <div
                    className={`p-2 rounded-md ${
                      isUp
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        高级情报
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          isUp
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {hintTypeNames[purchased.hintType] || purchased.hintType}
                      </span>
                      {purchased.itemName && (
                        <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                          {purchased.itemName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        影响系数 x{purchased.priceImpact.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90">
                      {purchased.storyText}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={story.id}
                className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/30 flex items-start gap-3"
              >
                <div className="p-2 rounded-md bg-purple-500/10 text-purple-300">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-2">
                    {story.teaser}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleBuyStory(story.id)}
                    disabled={buyingStoryId === story.id}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {buyingStoryId === story.id ? (
                      <>
                        <Loader2 className="mr-1 w-3 h-3 animate-spin" />
                        解密中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1 w-3 h-3" />
                        购买情报（{story.cost} 货币）
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedCategory(cat.value);
                loadData();
              }}
              className={
                selectedCategory === cat.value
                  ? "bg-cyan-500 text-black hover:bg-cyan-600"
                  : ""
              }
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* 刷新市场按钮 */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-cyan-500/20">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">下次刷新费用</p>
            <p className="text-sm font-mono text-yellow-400 flex items-center gap-1 justify-end">
              <DollarSign className="w-3 h-3" />
              {nextRefreshCost.toFixed(0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">今日已刷新</p>
            <p className="text-sm font-mono text-cyan-400">
              {refreshCount}/{MARKET_REFRESH_CONFIG.MAX_DAILY_REFRESH}
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing || reachedMaxRefresh || balance < nextRefreshCost}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
          >
            {refreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                刷新中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                刷新市场
              </>
            )}
          </Button>
        </div>
      </div>

      {reachedMaxRefresh && (
        <p className="text-xs text-yellow-400/80 text-center">
          今日刷新次数已达上限（{MARKET_REFRESH_CONFIG.MAX_DAILY_REFRESH} 次），请明日再来。
        </p>
      )}

      <Card className="border-cyan-500/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="w-5 h-5 text-cyan-400" />
            商品列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    商品名称
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    类别
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                    当前价格
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                    涨跌幅
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                    持有量
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    市场情绪
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const held = getInventoryQuantity(item.id);
                  const TrendIcon =
                    item.priceTrend === "up"
                      ? TrendingUp
                      : item.priceTrend === "down"
                      ? TrendingDown
                      : Minus;
                  const trendColor =
                    item.priceTrend === "up"
                      ? "text-green-400"
                      : item.priceTrend === "down"
                      ? "text-red-400"
                      : "text-muted-foreground";
                  const buffDesc = getBuffDescription(item);

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                          {buffDesc && (
                            <p className="text-xs text-purple-300 mt-1 flex items-center gap-1 flex-wrap">
                              <Sparkles className="w-3 h-3" />
                              {buffDesc}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {categoryNames[item.category] || item.category}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-yellow-400 font-bold">
                        {item.currentPrice.toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-sm ${trendColor}`}
                        >
                          <TrendIcon className="w-4 h-4" />
                          {item.changePercent > 0 ? "+" : ""}
                          {item.changePercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className={held > 0 ? "text-cyan-400" : "text-muted-foreground"}>
                          {held}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm max-w-[180px]">
                        <span className={trendColor}>{item.priceHint}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => openBuyDialog(item)}
                          >
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            买入
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            disabled={held === 0}
                            onClick={() => openSellDialog(item)}
                          >
                            <Package className="w-3 h-3 mr-1" />
                            卖出
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!tradeDialog.item}
        onOpenChange={(open) => !open && setTradeDialog({ item: null, type: "buy" })}
      >
        <DialogContent className="sm:max-w-md border-cyan-500/30 bg-card">
          <DialogHeader>
            <DialogTitle>
              {tradeDialog.type === "buy" ? "买入" : "卖出"} {tradeDialog.item?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
              <span className="text-muted-foreground">当前价格</span>
              <span className="text-xl font-bold text-yellow-400 font-mono">
                {tradeDialog.item?.currentPrice.toFixed(0)}
              </span>
            </div>

            {tradeDialog.item && getBuffDescription(tradeDialog.item) && (
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-xs text-purple-300 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {buffTypeNames[tradeDialog.item.buffType || ""] || "消耗品效果"}
                </p>
                <p className="text-sm text-foreground/90">
                  {getBuffDescription(tradeDialog.item)}
                </p>
              </div>
            )}

            {tradeDialog.type === "sell" && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">持有数量</span>
                <span className="font-mono text-cyan-400">{inventoryQty}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="quantity">数量</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={tradeDialog.type === "sell" ? inventoryQty : 100}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="text-center font-mono text-lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setQuantity(
                      Math.min(tradeDialog.type === "sell" ? inventoryQty : 100, quantity + 1)
                    )
                  }
                  disabled={
                    tradeDialog.type === "sell"
                      ? quantity >= inventoryQty
                      : quantity >= 100
                  }
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <span className="text-muted-foreground">
                {tradeDialog.type === "buy" ? "总计花费" : "预计收入"}
              </span>
              <span
                className={`text-xl font-bold font-mono flex items-center gap-1 ${
                  tradeDialog.type === "buy" ? "text-red-400" : "text-green-400"
                }`}
              >
                {tradeDialog.type === "buy" ? (
                  <ArrowDownRight className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
                {totalCost.toFixed(0)}
              </span>
            </div>

            {tradeDialog.type === "buy" && (
              <p className="text-xs text-muted-foreground text-center">
                当前余额: {balance.toFixed(0)}，
                {balance < totalCost ? (
                  <span className="text-red-400">余额不足</span>
                ) : (
                  <span className="text-green-400">余额充足</span>
                )}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTradeDialog({ item: null, type: "buy" })}
            >
              取消
            </Button>
            <Button
              onClick={handleTrade}
              disabled={
                trading ||
                (tradeDialog.type === "buy" && balance < totalCost) ||
                (tradeDialog.type === "sell" && inventoryQty < quantity)
              }
              className={
                tradeDialog.type === "buy"
                  ? "bg-green-500 hover:bg-green-600 text-black"
                  : "bg-yellow-500 hover:bg-yellow-600 text-black"
              }
            >
              {trading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : tradeDialog.type === "buy" ? (
                "确认买入"
              ) : (
                "确认卖出"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
