"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Briefcase,
  TrendingUp,
  Shield,
  Loader2,
  Star,
  Lock,
  Sparkles,
  Info,
  ShoppingCart,
  Coins,
  Cpu,
} from "lucide-react";
import { SKILL_UPGRADE_CONFIG } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface Skill {
  id: string;
  name: string;
  description: string;
  skillType: string;
  bonusType: string;
  bonusValue: number;
  maxLevel: number;
  icon: string | null;
  isActive: boolean;
  userLevel: number;
  acquired: boolean;
  acquiredAt: string | null;
  chipCount: number;
  chipsNeeded: number;
  isMaxed: boolean;
}

const skillTypeNames: Record<string, string> = {
  LABOR: "劳动技能",
  TRADING: "交易技能",
  SURVIVAL: "生存技能",
};

const skillTypeIcons: Record<string, typeof Briefcase> = {
  LABOR: Briefcase,
  TRADING: TrendingUp,
  SURVIVAL: Shield,
};

const skillTypeColors: Record<
  string,
  { text: string; border: string; bg: string; progress: string; glow: string }
> = {
  LABOR: {
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    progress: "bg-cyan-400",
    glow: "shadow-[0_0_15px_rgba(34,211,238,0.15)]",
  },
  TRADING: {
    text: "text-green-400",
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    progress: "bg-green-400",
    glow: "shadow-[0_0_15px_rgba(74,222,128,0.15)]",
  },
  SURVIVAL: {
    text: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    progress: "bg-purple-400",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
  },
};

const bonusTypeNames: Record<string, string> = {
  WORK_EFFICIENCY: "劳动效率",
  TRADING_PROFIT: "交易利润",
  STAMINA_MAX: "体力上限",
  HEALTH_MAX: "健康上限",
  CRIT_RATE: "暴击率",
  STAMINA_RECOVER: "体力恢复",
  HEALTH_RECOVER: "健康恢复",
  EARNINGS_BOOST: "收益加成",
  TRADE_BOOST: "交易加成",
  CRIT_BOOST: "暴击加成",
  EFFICIENCY: "效率",
  PROFIT: "利润",
  STAMINA: "体力",
};

// 格式化加成数值显示
function formatBonusValue(bonusType: string, value: number): string {
  if (value < 1 && value > 0) {
    return `+${(value * 100).toFixed(0)}%`;
  }
  return `+${value}`;
}

// 渲染星级
function renderStars(current: number, max: number): JSX.Element {
  const stars: JSX.Element[] = [];
  for (let i = 0; i < max; i++) {
    stars.push(
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${
          i < current
            ? "text-yellow-400 fill-yellow-400"
            : "text-muted-foreground/30"
        }`}
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

export function SkillsPageClient() {
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acquiredCount, setAcquiredCount] = useState(0);
  const [chipPrice, setChipPrice] = useState(0);
  const [balance, setBalance] = useState(0);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      const data = await res.json();
      if (data.code === 200) {
        setSkills(data.data.skills || []);
        setAcquiredCount(data.data.acquiredCount || 0);
        setChipPrice(data.data.chipPrice || 0);
        setBalance(data.data.balance || 0);
      } else {
        setError(data.message || "加载技能失败");
      }
    } catch (error) {
      console.error("加载技能失败", error);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  async function handleBuyChip(skillId: string, skillName: string) {
    setBuyingId(skillId);
    try {
      const res = await fetch("/api/skills/buy-chip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      const data = await res.json();
      if (data.code === 200) {
        toast({
          title: data.data.upgraded ? "技能升级！" : "芯片购买成功",
          description: data.message,
        });
        loadSkills();
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
      setBuyingId(null);
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
        <Info className="w-12 h-12 mb-4 text-red-400" />
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  const grouped = skills.reduce((acc, skill) => {
    const type = skill.skillType || "OTHER";
    if (!acc[type]) acc[type] = [];
    acc[type].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const typeOrder = ["LABOR", "TRADING", "SURVIVAL"];
  const sortedTypes = [
    ...typeOrder.filter((t) => grouped[t]),
    ...Object.keys(grouped).filter((t) => !typeOrder.includes(t)),
  ];

  const totalSkills = skills.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">技能芯片</h1>
          <p className="text-muted-foreground">
            购买芯片提升技能等级。芯片价格随购买次数递增，升级所需芯片数随等级递增。
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-xs text-muted-foreground">当前余额</p>
            <p className="text-xl font-bold text-yellow-400 font-mono">
              {balance.toFixed(0)}
            </p>
          </div>
          <div className="text-right p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <p className="text-xs text-muted-foreground">芯片价格</p>
            <p className="text-xl font-bold text-cyan-400 font-mono">
              {chipPrice}
            </p>
          </div>
          <div className="text-right p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <p className="text-xs text-muted-foreground">已获取技能</p>
            <p className="text-xl font-bold text-purple-400 font-mono">
              {acquiredCount}
              <span className="text-sm text-muted-foreground"> / {totalSkills}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 芯片说明 */}
      <Card className="border-yellow-500/30 bg-card/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-yellow-500/10 text-yellow-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-300">
                购买技能芯片快速提升等级
              </p>
              <p className="text-xs text-muted-foreground">
                每购买一个芯片，芯片价格增加 30%。升级所需芯片数 = 当前等级。
                劳动或交易时也有{" "}
                {(SKILL_UPGRADE_CONFIG.WORK_UPGRADE_CHANCE * 100).toFixed(0)}%
                概率免费升级。技能最高可升至 Lv.{SKILL_UPGRADE_CONFIG.MAX_LEVEL}。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分组展示 */}
      {sortedTypes.map((type) => {
        const typeSkills = grouped[type] || [];
        const typeName = skillTypeNames[type] || type;
        const TypeIcon = skillTypeIcons[type] || Zap;
        const colors = skillTypeColors[type] || skillTypeColors.LABOR;

        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center gap-2">
              <TypeIcon className={`w-5 h-5 ${colors.text}`} />
              <h2 className={`text-lg font-bold ${colors.text}`}>{typeName}</h2>
              <span className="text-xs text-muted-foreground">
                {typeSkills.filter((s) => s.acquired).length} / {typeSkills.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeSkills.map((skill) => {
                const maxLevel = Math.min(
                  skill.maxLevel,
                  SKILL_UPGRADE_CONFIG.MAX_LEVEL
                );
                const progressPercent =
                  maxLevel > 0 ? (skill.userLevel / maxLevel) * 100 : 0;
                const totalBonus = skill.userLevel * skill.bonusValue;
                const chipProgressPercent =
                  skill.chipsNeeded > 0
                    ? (skill.chipCount / skill.chipsNeeded) * 100
                    : 0;

                return (
                  <Card
                    key={skill.id}
                    className={`bg-card/50 border ${colors.border} ${
                      skill.acquired ? colors.glow : ""
                    } transition-all hover:shadow-lg`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-2 rounded-md ${colors.bg}`}>
                            {skill.acquired ? (
                              <Sparkles className={`w-4 h-4 ${colors.text}`} />
                            ) : (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">
                              {skill.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {bonusTypeNames[skill.bonusType] || skill.bonusType}
                            </p>
                          </div>
                        </div>
                        {skill.isMaxed && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 flex items-center gap-1 whitespace-nowrap">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            已满级
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {skill.description}
                      </p>

                      {/* 等级与进度 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">等级</span>
                          <span className="font-mono font-bold">
                            <span className={colors.text}>{skill.userLevel}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              / {maxLevel}
                            </span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-background/70 overflow-hidden">
                          <div
                            className={`h-full ${colors.progress} transition-all`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        {renderStars(skill.userLevel, maxLevel)}
                      </div>

                      {/* 芯片进度 */}
                      {!skill.isMaxed && (
                        <div className="space-y-1.5 pt-2 border-t border-cyan-500/10">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Cpu className="w-3 h-3" />
                              芯片进度
                            </span>
                            <span className="font-mono text-xs text-yellow-400">
                              {skill.chipCount} / {skill.chipsNeeded}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-background/70 overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 transition-all"
                              style={{ width: `${chipProgressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 加成效果 */}
                      <div className="space-y-1 pt-2 border-t border-cyan-500/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">每级加成</span>
                          <span className="font-mono text-green-400">
                            {formatBonusValue(skill.bonusType, skill.bonusValue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">当前总加成</span>
                          <span
                            className={`font-mono font-bold ${
                              skill.acquired ? "text-green-400" : "text-muted-foreground"
                            }`}
                          >
                            {skill.acquired
                              ? formatBonusValue(skill.bonusType, totalBonus)
                              : "未获取"}
                          </span>
                        </div>
                      </div>

                      {/* 购买按钮 */}
                      {!skill.isMaxed ? (
                        <Button
                          onClick={() => handleBuyChip(skill.id, skill.name)}
                          disabled={buyingId === skill.id || balance < chipPrice}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                        >
                          {buyingId === skill.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              购买中...
                            </>
                          ) : balance < chipPrice ? (
                            <>
                              <Coins className="w-4 h-4 mr-2" />
                              余额不足
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              购买芯片 ({chipPrice} 币)
                            </>
                          )}
                        </Button>
                      ) : skill.acquired ? (
                        <Button disabled className="w-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                          <Star className="w-4 h-4 mr-2 fill-yellow-400" />
                          已满级
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          通过劳动或交易有几率自动获取
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {skills.length === 0 && (
        <Card className="border-cyan-500/20 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Zap className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">暂无技能数据</p>
            <p className="text-sm">技能将在劳动或交易后陆续解锁</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}