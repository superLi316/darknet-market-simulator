// 技能管理服务 - 处理用户技能查询、升级与加成计算
import { prisma } from "@/lib/db";
import { SKILL_UPGRADE_CONFIG } from "@/types";

// 升级结果类型
export interface SkillUpgradeResult {
  success: boolean;
  reason: string;
  userSkill: {
    id: string;
    userId: string;
    skillId: string;
    level: number;
    acquiredAt: Date;
    skill: {
      id: string;
      name: string;
      description: string;
      skillType: string;
      bonusType: string;
      bonusValue: number;
      maxLevel: number;
    };
  } | null;
  newLevel: number | null;
  maxLevel: number | null;
}

// 获取用户所有技能（含等级）
// 返回 UserSkill 数组（含关联的 Skill 定义），错误由调用方 try-catch 处理
export async function getUserSkills(userId: string) {
  const userSkills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: true },
    orderBy: { acquiredAt: "asc" },
  });
  return userSkills;
}

// 获取所有可用技能定义
// 返回 Skill 数组，错误由调用方 try-catch 处理
export async function getAllSkills() {
  const skills = await prisma.skill.findMany({
    where: { isActive: true },
    orderBy: [{ skillType: "asc" }, { createdAt: "asc" }],
  });
  return skills;
}

// 升级指定技能（如果未满级）
export async function upgradeSkill(
  userId: string,
  skillId: string
): Promise<SkillUpgradeResult> {
  try {
    const userSkill = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
      include: { skill: true },
    });

    if (!userSkill) {
      return {
        success: false,
        reason: "SKILL_NOT_OWNED",
        userSkill: null,
        newLevel: null,
        maxLevel: null,
      };
    }

    // 取技能自身 maxLevel 与全局 MAX_LEVEL 的较小值作为上限
    const maxLevel = Math.min(
      userSkill.skill.maxLevel,
      SKILL_UPGRADE_CONFIG.MAX_LEVEL
    );

    if (userSkill.level >= maxLevel) {
      return {
        success: false,
        reason: "MAX_LEVEL_REACHED",
        userSkill,
        newLevel: userSkill.level,
        maxLevel,
      };
    }

    const updated = await prisma.userSkill.update({
      where: { id: userSkill.id },
      data: { level: { increment: 1 } },
      include: { skill: true },
    });

    return {
      success: true,
      reason: "UPGRADED",
      userSkill: updated,
      newLevel: updated.level,
      maxLevel,
    };
  } catch (error) {
    console.error("[UPGRADE_SKILL_ERROR]", error);
    return {
      success: false,
      reason: "SERVER_ERROR",
      userSkill: null,
      newLevel: null,
      maxLevel: null,
    };
  }
}

// 获取指定类型的技能加成总值
// 返回 sum(level * skill.bonusValue) for all matching skills
export async function getSkillBonus(
  userId: string,
  bonusType: string
): Promise<number> {
  try {
    const userSkills = await prisma.userSkill.findMany({
      where: {
        userId,
        skill: { bonusType },
      },
      include: { skill: true },
    });

    const totalBonus = userSkills.reduce(
      (sum, us) => sum + us.level * us.skill.bonusValue,
      0
    );

    return totalBonus;
  } catch (error) {
    console.error("[GET_SKILL_BONUS_ERROR]", error);
    return 0;
  }
}
