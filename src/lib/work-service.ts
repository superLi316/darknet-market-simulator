// 劳动暴击与健康损失服务
// 处理劳动执行、暴击判定、健康损失、技能升级
import { prisma } from "@/lib/db";
import { calculateWorkEarnings } from "@/lib/economy";
import { clamp, randomInRange } from "@/lib/utils";
import { upgradeSkill } from "@/lib/skill-service";
import {
  WORK_CRIT_CONFIG,
  WORK_HEALTH_LOSS,
  SKILL_UPGRADE_CONFIG,
  WORK_TYPE_CONFIG,
} from "@/types";
import type { WorkType, PersonalityType, WorkDifficulty } from "@/types";

// 劳动执行结果
export interface WorkExecuteResult {
  success: boolean;
  reason?: string;
  workRecord?: {
    id: string;
    workType: string;
    difficulty: string;
    basePay: number;
    personalityBonus: number;
    skillBonus: number;
    finalEarnings: number;
    staminaCost: number;
    isCritical: boolean;
    critMultiplier: number;
    healthLoss: number;
    skillUpgraded: boolean;
    upgradedSkillId: string | null;
  };
  earnings?: number;
  baseEarnings?: number;
  staminaCost?: number;
  staminaRemaining?: number;
  healthLoss?: number;
  healthRemaining?: number;
  isCritical?: boolean;
  critMultiplier?: number;
  critChance?: number;
  skillUpgraded?: boolean;
  upgradedSkillId?: string | null;
  upgradedSkill?: {
    id: string;
    level: number;
    skill: { id: string; name: string; bonusType: string; bonusValue: number };
  } | null;
}

// 技能升级检查结果
export interface SkillUpgradeCheckResult {
  upgraded: boolean;
  upgradedSkillId: string | null;
  upgradedSkill: {
    id: string;
    level: number;
    skill: { id: string; name: string; bonusType: string; bonusValue: number };
  } | null;
}

// 执行劳动（含暴击判定）
// 暴击率 = BASE_CRIT_CHANCE + (总技能等级 * SKILL_CRIT_BONUS)
// 暴击时 finalEarnings 乘以 2-5 倍随机倍率
// 困难劳动(MEDIUM/HARD)损失健康值
export async function executeWorkWithCrit(
  userId: string,
  workType: string
): Promise<WorkExecuteResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { skills: { include: { skill: true } } },
    });

    if (!user) {
      return { success: false, reason: "USER_NOT_FOUND" };
    }

    if (user.status !== "ALIVE") {
      return { success: false, reason: "USER_NOT_ALIVE" };
    }

    // 优先从数据库获取劳动配置，回退到静态配置
    const dbWorkConfig = await prisma.workTypeConfig.findUnique({
      where: { workType },
    });

    const staticConfig = WORK_TYPE_CONFIG[workType as WorkType];
    if (!dbWorkConfig && !staticConfig) {
      return { success: false, reason: "INVALID_WORK_TYPE" };
    }

    const basePay = dbWorkConfig?.basePay ?? staticConfig.basePay;
    const staminaCost = dbWorkConfig?.staminaCost ?? staticConfig.staminaCost;
    const difficulty = (dbWorkConfig?.difficulty ?? staticConfig.difficulty) as WorkDifficulty;
    const workName = dbWorkConfig?.name ?? staticConfig.name;

    // 检查体力
    if (user.stamina < staminaCost) {
      return { success: false, reason: "INSUFFICIENT_STAMINA" };
    }

    // 计算 WORK_EFFICIENCY 技能加成
    const efficiencyBonus = user.skills
      .filter((us) => us.skill.bonusType === "WORK_EFFICIENCY")
      .reduce((sum, us) => sum + us.level * us.skill.bonusValue, 0);
    const skillBonusMultiplier = 1 + efficiencyBonus;

    // 计算基础收益（含性格与技能加成）
    const earnings = calculateWorkEarnings(
      workType as WorkType,
      user.personality as PersonalityType,
      skillBonusMultiplier
    );

    // 暴击判定：暴击率 = BASE_CRIT_CHANCE + (总技能等级 * SKILL_CRIT_BONUS)
    const totalSkillLevel = user.skills.reduce((sum, us) => sum + us.level, 0);
    const critChance = clamp(
      WORK_CRIT_CONFIG.BASE_CRIT_CHANCE +
        totalSkillLevel * WORK_CRIT_CONFIG.SKILL_CRIT_BONUS,
      0,
      0.75 // 上限 75%，避免必爆
    );
    const isCritical = Math.random() < critChance;
    const critMultiplier = isCritical
      ? randomInRange(
          WORK_CRIT_CONFIG.CRIT_MULTIPLIER_MIN,
          WORK_CRIT_CONFIG.CRIT_MULTIPLIER_MAX
        )
      : 1;

    // 暴击收益
    const finalEarnings =
      Math.round(earnings.finalEarnings * critMultiplier * 100) / 100;

    // 困难劳动健康损失
    const healthLoss = WORK_HEALTH_LOSS[difficulty] || 0;
    const newHealth = Math.max(0, user.health - healthLoss);
    const newStamina = user.stamina - staminaCost;
    const now = new Date();

    // 检查技能升级（劳动时 8% 概率）
    const skillUpgradeResult = await checkSkillUpgrade(userId, "WORK");

    // 创建劳动记录并更新用户状态
    const [workRecord] = await prisma.$transaction([
      prisma.workRecord.create({
        data: {
          userId,
          workType,
          difficulty,
          basePay: earnings.basePay,
          personalityBonus: earnings.personalityBonus,
          skillBonus: earnings.skillBonus,
          finalEarnings,
          staminaCost: earnings.staminaCost,
          success: true,
          isCritical,
          critMultiplier: Math.round(critMultiplier * 100) / 100,
          healthLoss,
          skillUpgraded: skillUpgradeResult.upgraded,
          upgradedSkillId: skillUpgradeResult.upgradedSkillId,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          balance: { increment: finalEarnings },
          stamina: newStamina,
          health: newHealth,
          lastStaminaRecover: now,
          totalEarned: { increment: finalEarnings },
          workCount: { increment: 1 },
        },
      }),
    ]);

    // 暴击通知
    if (isCritical) {
      await prisma.notification.create({
        data: {
          userId,
          type: "CRIT",
          title: "暴击触发",
          content: `你在「${workName}」劳动中触发暴击，收益提升至 ${critMultiplier.toFixed(
            1
          )} 倍！获得 ${finalEarnings} 货币。`,
        },
      });
    }

    // 技能升级通知
    if (
      skillUpgradeResult.upgraded &&
      skillUpgradeResult.upgradedSkill
    ) {
      await prisma.notification.create({
        data: {
          userId,
          type: "SKILL_UP",
          title: "技能升级",
          content: `你的技能「${skillUpgradeResult.upgradedSkill.skill.name}」升级到了 Lv.${skillUpgradeResult.upgradedSkill.level}！`,
        },
      });
    }

    return {
      success: true,
      workRecord,
      earnings: finalEarnings,
      baseEarnings: earnings.finalEarnings,
      staminaCost: earnings.staminaCost,
      staminaRemaining: newStamina,
      healthLoss,
      healthRemaining: newHealth,
      isCritical,
      critMultiplier: Math.round(critMultiplier * 100) / 100,
      critChance,
      skillUpgraded: skillUpgradeResult.upgraded,
      upgradedSkillId: skillUpgradeResult.upgradedSkillId,
      upgradedSkill: skillUpgradeResult.upgradedSkill,
    };
  } catch (error) {
    console.error("[EXECUTE_WORK_CRIT_ERROR]", error);
    return { success: false, reason: "SERVER_ERROR" };
  }
}

// 检查技能是否升级
// 劳动时 8% 概率，交易时 5% 概率
// 随机选一个已拥有且未满级的技能升级
export async function checkSkillUpgrade(
  userId: string,
  context: "WORK" | "TRADE"
): Promise<SkillUpgradeCheckResult> {
  try {
    const chance =
      context === "WORK"
        ? SKILL_UPGRADE_CONFIG.WORK_UPGRADE_CHANCE
        : SKILL_UPGRADE_CONFIG.TRADE_UPGRADE_CHANCE;

    // 先判定是否触发升级
    if (Math.random() >= chance) {
      return { upgraded: false, upgradedSkillId: null, upgradedSkill: null };
    }

    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    if (userSkills.length === 0) {
      return { upgraded: false, upgradedSkillId: null, upgradedSkill: null };
    }

    // 过滤可升级的技能（未满级）
    const upgradeableSkills = userSkills.filter((us) => {
      const maxLevel = Math.min(
        us.skill.maxLevel,
        SKILL_UPGRADE_CONFIG.MAX_LEVEL
      );
      return us.level < maxLevel;
    });

    if (upgradeableSkills.length === 0) {
      return { upgraded: false, upgradedSkillId: null, upgradedSkill: null };
    }

    // 随机选一个技能升级
    const selected =
      upgradeableSkills[Math.floor(Math.random() * upgradeableSkills.length)];
    const result = await upgradeSkill(userId, selected.skillId);

    return {
      upgraded: result.success,
      upgradedSkillId: result.success ? selected.skillId : null,
      upgradedSkill: result.userSkill as SkillUpgradeCheckResult["upgradedSkill"],
    };
  } catch (error) {
    console.error("[CHECK_SKILL_UPGRADE_ERROR]", error);
    return { upgraded: false, upgradedSkillId: null, upgradedSkill: null };
  }
}
