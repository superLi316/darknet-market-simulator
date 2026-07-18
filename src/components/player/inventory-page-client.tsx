"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface InventoryLot {
  id: string;
  quantity: number;
  buyPrice: number;
  purchaseDate: string;
  expiresAt: string | null;
}

interface InventoryItem {
  itemId: string;
  item: {
    id: string;
    name: string;
    description?: string;
    category: string;
    currentPrice: number;
    buffType?: string | null;
    buffValue?: number | null;
    buffDuration?: number | null;
    healthEffect?: number;
    staminaEffect?: number;
  };
  totalQuantity: number;
  averageBuyPrice: number;
  totalCost: number;
  currentValue: number;
  profitLoss: number;
  profitPercent: number;
  lots: InventoryLot[];
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

// 获取消耗品的 buff 效果说明
function getBuffDescription(item: InventoryItem["item"]): string {
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
    parts.push(`健康 ${item.healthEffect > 0 ? "+" : ""}${item.healthEffect}`);
  }
  if (item.staminaEffect && item.staminaEffect !== 0) {
    parts.push(`体力 ${item.staminaEffect > 0 ? "+" : ""}${item.staminaEffect}`);
  }
  return parts.join("，");
}

export function InventoryPageClient() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [sellDialog, setSellDialog] = useState<{
    item: InventoryItem | null;
  }>({ item: null });
  const [quantity, setQuantity] = useState(1);
  const [selling, setSelling] = useState(false);
  const [consumingItemId, setConsumingItemId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  async function loadData() {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (data.code === 200) {
        setItems(data.data.items || []);
      }
    } catch (error) {
      console.error("加载库存失败", error);
    } finally {
      setLoading(false);
    }
  }

  function openSellDialog(item: InventoryItem) {
    setSellDialog({ item });
    setQuantity(1);
  }

  // 找到第一个可用批次（FIFO）
  function getFirstAvailableLot(item: InventoryItem): InventoryLot | null {
    return item.lots.find((lot) => lot.quantity > 0) || null;
  }

  async function handleConsume(item: InventoryItem) {
    const lot = getFirstAvailableLot(item);
    if (!lot) {
      toast({
        title: "无法食用",
        description: "没有可用的库存批次",
        variant: "destructive",
      });
      return;
    }

    setConsumingItemId(item.itemId);
    try {
      const res = await fetch("/api/inventory/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: lot.id }),
      });
      const data = await res.json();

      if (data.code === 200) {
        const result = data.data;
        // 构建效果说明
        const effectParts: string[] = [];
        if (result.staminaChange && result.staminaChange !== 0) {
          effectParts.push(
            `体力 ${result.staminaChange > 0 ? "+" : ""}${result.staminaChange}`
          );
        }
        if (result.healthChange && result.healthChange !== 0) {
          effectParts.push(
            `健康 ${result.healthChange > 0 ? "+" : ""}${result.healthChange}`
          );
        }
        if (result.maxStaminaChange && result.maxStaminaChange !== 0) {
          effectParts.push(
            `最大体力 ${result.maxStaminaChange > 0 ? "+" : ""}${result.maxStaminaChange}`
          );
        }
        if (result.isTemporaryBuff) {
          effectParts.push(
            `获得 ${buffTypeNames[result.buffType] || result.buffType} 效果`
          );
        }

        toast({
          title: "食用成功",
          description: `消耗了 ${result.itemName}${
            effectParts.length > 0 ? `，效果：${effectParts.join("，")}` : ""
          }，剩余 ${result.remainingQuantity} 个`,
        });
        loadData();
      } else {
        toast({
          title: "食用失败",
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
      setConsumingItemId(null);
    }
  }

  async function handleSell() {
    if (!sellDialog.item) return;

    setSelling(true);
    try {
      const res = await fetch("/api/market/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: sellDialog.item.itemId,
          quantity,
        }),
      });
      const data = await res.json();

      if (data.code === 200) {
        toast({
          title: "出售成功！",
          description: `获得 ${data.data.totalRevenue.toFixed(0)} 货币，利润 ${data.data.totalProfit.toFixed(0)}`,
        });
        setSellDialog({ item: null });
        loadData();
      } else {
        toast({
          title: "出售失败",
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
      setSelling(false);
    }
  }

  const filteredItems = selectedCategory
    ? items.filter((i) => i.item.category === selectedCategory)
    : items;

  const totalValue = items.reduce((sum, i) => sum + i.currentValue, 0);
  const totalCost = items.reduce((sum, i) => sum + i.totalCost, 0);
  const totalProfit = items.reduce((sum, i) => sum + i.profitLoss, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">我的库存</h1>
        <p className="text-muted-foreground">
          管理你的物资与商品。消耗品可食用以获得 buff 效果，注意保质期，过期将自动清除。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-cyan-500/20 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              库存总价值
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-cyan-400 font-mono">
              {totalValue.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总成本
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400 font-mono">
              {totalCost.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-${totalProfit >= 0 ? "green" : "red"}-500/20 bg-card/50`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              浮动盈亏
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold font-mono flex items-center gap-1 ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
              {totalProfit >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              {totalProfit >= 0 ? "+" : ""}
              {totalProfit.toFixed(0)}
              <span className="text-sm opacity-70">
                ({totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(1) : 0}%)
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
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

      <Card className="border-cyan-500/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            库存列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">库存为空</p>
              <p className="text-sm">去黑市购买一些商品吧</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const isExpanded = expandedItem === item.itemId;
                const isProfit = item.profitLoss >= 0;
                const hasExpiry = item.item.category === "CONSUMABLE";
                const isConsumable = item.item.category === "CONSUMABLE";
                const buffDesc = getBuffDescription(item.item);

                return (
                  <div
                    key={item.itemId}
                    className="border border-cyan-500/10 rounded-lg overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-cyan-500/5 transition-colors flex-wrap gap-2"
                      onClick={() =>
                        setExpandedItem(isExpanded ? null : item.itemId)
                      }
                    >
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                        <div>
                          <p className="font-medium">{item.item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {categoryNames[item.item.category] || item.item.category}
                          </p>
                          {buffDesc && (
                            <p className="text-xs text-purple-300 mt-1 flex items-center gap-1 flex-wrap">
                              <Sparkles className="w-3 h-3" />
                              {buffDesc}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">持有数量</p>
                          <p className="font-mono font-bold">{item.totalQuantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">现价/成本</p>
                          <p className="font-mono text-sm">
                            <span className="text-yellow-400">{item.item.currentPrice.toFixed(0)}</span>
                            {" / "}
                            <span>{item.averageBuyPrice.toFixed(0)}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">浮动盈亏</p>
                          <p className={`font-mono font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}>
                            {isProfit ? "+" : ""}
                            {item.profitLoss.toFixed(0)}
                            <span className="text-xs opacity-70 ml-1">
                              ({item.profitPercent.toFixed(1)}%)
                            </span>
                          </p>
                        </div>
                        {isConsumable && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={consumingItemId === item.itemId}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConsume(item);
                            }}
                            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                          >
                            {consumingItemId === item.itemId ? (
                              <>
                                <Loader2 className="mr-1 w-3 h-3 animate-spin" />
                                食用中
                              </>
                            ) : (
                              <>
                                <Utensils className="mr-1 w-3 h-3" />
                                食用
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSellDialog(item);
                          }}
                        >
                          卖出
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-cyan-500/10 p-4 bg-background/30">
                        {buffDesc && (
                          <div className="mb-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/30">
                            <p className="text-xs text-purple-300 mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {buffTypeNames[item.item.buffType || ""] || "消耗品效果"}
                            </p>
                            <p className="text-sm text-foreground/90">{buffDesc}</p>
                          </div>
                        )}
                        <p className="text-sm font-medium mb-3 text-muted-foreground">
                          FIFO 批次明细
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="text-left py-2 px-3">批次</th>
                                <th className="text-right py-2 px-3">数量</th>
                                <th className="text-right py-2 px-3">买入价</th>
                                <th className="text-right py-2 px-3">买入时间</th>
                                {hasExpiry && (
                                  <th className="text-right py-2 px-3">过期时间</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {item.lots.map((lot, idx) => (
                                <tr key={lot.id} className="border-t border-cyan-500/5">
                                  <td className="py-2 px-3">#{idx + 1}</td>
                                  <td className="py-2 px-3 text-right font-mono">
                                    {lot.quantity}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-yellow-400">
                                    {lot.buyPrice.toFixed(0)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-muted-foreground">
                                    {new Date(lot.purchaseDate).toLocaleString("zh-CN")}
                                  </td>
                                  {hasExpiry && (
                                    <td className="py-2 px-3 text-right">
                                      {lot.expiresAt ? (
                                        <span
                                          className={
                                            new Date(lot.expiresAt) < new Date()
                                              ? "text-red-400"
                                              : "text-muted-foreground"
                                          }
                                        >
                                          <Clock className="w-3 h-3 inline mr-1" />
                                          {new Date(lot.expiresAt).toLocaleDateString("zh-CN")}
                                        </span>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!sellDialog.item}
        onOpenChange={(open) => !open && setSellDialog({ item: null })}
      >
        <DialogContent className="sm:max-w-md border-cyan-500/30 bg-card">
          <DialogHeader>
            <DialogTitle>卖出 {sellDialog.item?.item.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">持有数量</p>
                <p className="font-mono font-bold text-cyan-400">
                  {sellDialog.item?.totalQuantity}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">当前价格</p>
                <p className="font-mono font-bold text-yellow-400">
                  {sellDialog.item?.item.currentPrice.toFixed(0)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">平均成本</p>
              <p className="font-mono">{sellDialog.item?.averageBuyPrice.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sell-quantity">卖出数量</Label>
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
                  id="sell-quantity"
                  type="number"
                  min={1}
                  max={sellDialog.item?.totalQuantity || 1}
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
                      Math.min(sellDialog.item?.totalQuantity || 1, quantity + 1)
                    )
                  }
                  disabled={quantity >= (sellDialog.item?.totalQuantity || 0)}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <span className="text-muted-foreground">预计收入</span>
              <span className="text-xl font-bold text-green-400 font-mono">
                {((sellDialog.item?.item.currentPrice || 0) * quantity).toFixed(0)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialog({ item: null })}>
              取消
            </Button>
            <Button
              onClick={handleSell}
              disabled={selling || quantity > (sellDialog.item?.totalQuantity || 0)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {selling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
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
