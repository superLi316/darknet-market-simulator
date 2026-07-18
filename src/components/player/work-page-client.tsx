"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Clock,
  Star,
  Lock,
  Zap,
  Loader2,
  TrendingUp,
  Heart,
  Sparkles,
  AlertTriangle,
  Crosshair,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PERSONALITY_CONFIG, WORK_HEALTH_LOSS } from "@/types";

interface WorkType {
  id: string;
  workType: string;
  name: string;
  description: string;
  basePay: number;
  staminaCost: number;
  difficulty: string;
  cooldownMinutes: number;
}

interface WorkStatus {
  currentStamina: number;
  maxStamina: number;
  nextRecoveryAt: string;
  cooldowns: Record<string, { remaining: number; endTime: string | null }>;
  recentRecords: any[];
  critChance?: number;
}

interface WorkResult {
  workType: string;
  earnings: number;
  baseEarnings: number;
  staminaCost: number;
  staminaRemaining: number;
  healthLoss: number;
  healthRemaining: number;
  isCritical: boolean;
  critMultiplier: number;
  critChance: number;
  skillUpgraded: boolean;
  upgradedSkill: {
    id: string;
    level: number;
    skill: { id: string; name: string; bonusType: string; bonusValue: number };
  } | null;
}

const workIcons: Record<string, typeof Briefcase> = {
  CARRYING: Briefcase,
  DELIVERY: Zap,
  HACKING: Lock,
  MINING: TrendingUp,
  FORGERY: Star,
};

const difficultyColors: Record<string, string> = {
  EASY: "text-green-400 border-green-500/30",
  MEDIUM: "text-yellow-400 border-yellow-500/30",
  HARD: "text-red-400 border-red-500/30",
};

const difficultyNames: Record<string, string> = {
  EASY: "简单",
  MEDIUM: "中等",
  HARD: "困难",
};

// 难度对应的健康损失风险
function getHealthRisk(difficulty: string): { loss: number; label: string } {
  const loss = WORK_HEALTH_LOSS[difficulty as keyof typeof WORK_HEALTH_LOSS] ?? 0;
  if (loss === 0) return { loss: 0, label: "无风险" };
  return { loss, label: `-${loss} 健康` };
}

export function WorkPageClient({ personality }: { personality: string }) {
  const { toast } = useToast();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [workStatus, setWorkStatus] = useState<WorkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [lastResult, setLastResult] = useState<WorkResult | null>(null);
  const [critChance, setCritChance] = useState<number | null>(null);

  const personalityConfig = PERSONALITY_CONFIG[personality as keyof typeof PERSONALITY_CONFIG];

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    try {
      const [typesRes, statusRes] = await Promise.all([
        fetch("/api/work/types"),
        fetch("/api/work/status"),
      ]);
      const typesData = await typesRes.json();
      const statusData = await statusRes.json();

      if (typesData.code === 200) setWorkTypes(typesData.data);
      if (statusData.code === 200) {
        setWorkStatus(statusData.data);
        // 如果 API 返回 critChance 则使用
        if (typeof statusData.data.critChance === "number") {
          setCritChance(statusData.data.critChance);
        }
      }
    } catch (error) {
      console.error("加载劳动数据失败", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleWork(workType: string) {
    setWorking(workType);
    try {
      const res = await fetch("/api/work/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workType }),
      });
      const data = await res.json();

      if (data.code === 200) {
        const result: WorkResult = data.data;
        setLastResult(result);
        setCritChance(result.critChance);

        // 构建详细的 toast 描述
        const descParts: string[] = [
          `获得 ${result.earnings.toFixed(0)} 货币，消耗 ${result.staminaCost} 体力`,
        ];
        if (result.isCritical) {
          descParts.push(`暴击 x${result.critMultiplier.toFixed(1)}！`);
        }
        if (result.healthLoss > 0) {
          descParts.push(`健康 -${result.healthLoss}`);
        }
        if (result.skillUpgraded && result.upgradedSkill) {
          descParts.push(
            `技能「${result.upgradedSkill.skill.name}」升至 Lv.${result.upgradedSkill.level}`
          );
        }

        toast({
          title: result.isCritical ? "暴击触发！" : "劳动完成！",
          description: descParts.join("，"),
        });
        loadData();
      } else {
        toast({
          title: "劳动失败",
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
      setWorking(null);
    }
  }

  function getRemainingSeconds(workType: string): number {
    if (!workStatus?.cooldowns[workType]) return 0;
    const endTime = workStatus.cooldowns[workType].endTime;
    if (!endTime) return 0;
    const remaining = Math.ceil((new Date(endTime).getTime() - now) / 1000);
    return Math.max(0, remaining);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function getEstimatedEarnings(work: WorkType): number {
    let multiplier = personalityConfig.workMultiplier;
    return Math.round(work.basePay * multiplier * 100) / 100;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">劳动中心</h1>
          <p className="text-muted-foreground">
            选择一种劳动方式赚取货币。注意体力消耗，合理安排休息。
          </p>
        </div>
        <div className="flex items-center gap-4">
          {critChance !== null && (
            <div className="text-right p-2 px-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <Crosshair className="w-3 h-3" />
                当前暴击率
              </p>
              <p className="text-lg font-bold text-purple-300 font-mono">
                {(critChance * 100).toFixed(1)}%
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="text-sm text-muted-foreground">当前体力</p>
            <p className="text-xl font-bold text-green-400 font-mono">
              {workStatus?.currentStamina || 0}/{workStatus?.maxStamina || 100}
            </p>
          </div>
        </div>
      </div>

      {/* 最近一次劳动结果 */}
      {lastResult && (
        <Card
          className={`bg-card/50 border ${
            lastResult.isCritical
              ? "border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.25)]"
              : "border-cyan-500/30"
          }`}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {lastResult.isCritical ? (
                <>
                  <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                  <span className="text-purple-300">暴击触发！x{lastResult.critMultiplier.toFixed(1)} 倍奖励</span>
                </>
              ) : (
                <>
                  <Briefcase className="w-5 h-5 text-cyan-400" />
                  <span>劳动完成</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">获得货币</p>
                <p className="font-mono text-green-400 font-bold flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +{lastResult.earnings.toFixed(0)}
                </p>
                {lastResult.isCritical && (
                  <p className="text-xs text-purple-300 mt-1">
                    基础 {lastResult.baseEarnings.toFixed(0)} → 暴击 x{lastResult.critMultiplier.toFixed(1)}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">体力消耗</p>
                <p className="font-mono text-red-400 font-bold">
                  -{lastResult.staminaCost}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  剩余 {lastResult.staminaRemaining}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">健康变化</p>
                {lastResult.healthLoss > 0 ? (
                  <p className="font-mono text-red-400 font-bold flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    -{lastResult.healthLoss}
                  </p>
                ) : (
                  <p className="font-mono text-green-400 font-bold">无损失</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  剩余 {lastResult.healthRemaining}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">技能升级</p>
                {lastResult.skillUpgraded && lastResult.upgradedSkill ? (
                  <p className="font-mono text-yellow-400 font-bold flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Lv.{lastResult.upgradedSkill.level}
                  </p>
                ) : (
                  <p className="font-mono text-muted-foreground">未触发</p>
                )}
                {lastResult.skillUpgraded && lastResult.upgradedSkill && (
                  <p className="text-xs text-yellow-400 mt-1">
                    {lastResult.upgradedSkill.skill.name}
                  </p>
                )}
              </div>
            </div>

            {lastResult.skillUpgraded && lastResult.upgradedSkill && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3">
                <Star className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-yellow-300">
                    技能升级！{lastResult.upgradedSkill.skill.name} 提升到 Lv.{lastResult.upgradedSkill.level} 级
                  </p>
                  <p className="text-xs text-muted-foreground">
                    继续劳动或交易可触发更多技能升级
                  </p>
                </div>
              </div>
            )}

            {lastResult.healthLoss > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-300">
                    健康值 -{lastResult.healthLoss}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    高难度劳动有健康损失风险，请注意恢复
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLastResult(null)}
              >
                关闭
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workTypes.map((work) => {
          const Icon = workIcons[work.workType] || Briefcase;
          const remaining = getRemainingSeconds(work.workType);
          const isOnCooldown = remaining > 0;
          const estimated = getEstimatedEarnings(work);
          const canWork = !isOnCooldown && (workStatus?.currentStamina || 0) >= work.staminaCost;
          const risk = getHealthRisk(work.difficulty);

          return (
            <Card
              key={work.id}
              className={`bg-card/50 border transition-all hover:shadow-lg ${difficultyColors[work.difficulty]}`}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-lg bg-background/50`}>
                    <Icon className={`w-6 h-6 ${difficultyColors[work.difficulty].split(" ")[0]}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{work.name}</CardTitle>
                    <span className={`text-xs ${difficultyColors[work.difficulty].split(" ")[0]}`}>
                      {difficultyNames[work.difficulty]}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{work.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">基础报酬:</span>
                    <span className="font-mono text-yellow-400">{work.basePay}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">预计收益:</span>
                    <span className="font-mono text-green-400">≈{estimated}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">体力消耗:</span>
                    <span className="font-mono text-red-400">{work.staminaCost}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">冷却时间:</span>
                    <span className="font-mono">{work.cooldownMinutes}分钟</span>
                  </div>
                  <div
                    className={`col-span-2 flex items-center gap-2 px-2 py-1.5 rounded-md ${
                      risk.loss === 0
                        ? "bg-green-500/10"
                        : "bg-red-500/10"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        risk.loss === 0 ? "text-green-400" : "text-red-400"
                      }`}
                    />
                    <span className="text-muted-foreground">健康风险:</span>
                    <span
                      className={`font-mono font-medium ${
                        risk.loss === 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {risk.label}
                    </span>
                  </div>
                </div>

                {isOnCooldown ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground mb-1">冷却中</p>
                    <p className="text-xl font-mono text-yellow-400">
                      {formatTime(remaining)}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleWork(work.workType)}
                    disabled={working === work.workType || !canWork}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                  >
                    {working === work.workType ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        工作中...
                      </>
                    ) : canWork ? (
                      "开始工作"
                    ) : (
                      "体力不足"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {workStatus?.recentRecords && workStatus.recentRecords.length > 0 && (
        <Card className="border-cyan-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">最近劳动记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-500/20">
                    <th className="text-left py-2 px-3 text-sm text-muted-foreground">类型</th>
                    <th className="text-right py-2 px-3 text-sm text-muted-foreground">基础报酬</th>
                    <th className="text-right py-2 px-3 text-sm text-muted-foreground">性格加成</th>
                    <th className="text-right py-2 px-3 text-sm text-muted-foreground">最终收益</th>
                    <th className="text-right py-2 px-3 text-sm text-muted-foreground">体力消耗</th>
                    <th className="text-right py-2 px-3 text-sm text-muted-foreground">暴击</th>
                    <th className="text-right py-2 px-3 text-sm text-muted-foreground">健康</th>
                    <th className="text-right py-2 px-3 text-sm text-muted-foreground">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {workStatus.recentRecords.map((record) => (
                    <tr key={record.id} className="border-b border-cyan-500/10">
                      <td className="py-2 px-3">{record.workType}</td>
                      <td className="py-2 px-3 text-right font-mono">{record.basePay}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        x{record.personalityBonus.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-green-400">
                        +{record.finalEarnings.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-red-400">
                        -{record.staminaCost}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {record.isCritical ? (
                          <span className="text-purple-300 flex items-center gap-1 justify-end">
                            <Sparkles className="w-3 h-3" />
                            x{record.critMultiplier?.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {record.healthLoss > 0 ? (
                          <span className="text-red-400">-{record.healthLoss}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-sm text-muted-foreground">
                        {new Date(record.completedAt).toLocaleTimeString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
