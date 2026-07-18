import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { getUserSkills, getAllSkills } from "@/lib/skill-service";
import { SKILL_CHIP_CONFIG, SKILL_UPGRADE_CONFIG } from "@/types";

// 计算当前芯片价格
function calculateChipPrice(totalPurchased: number): number {
  return Math.round(
    SKILL_CHIP_CONFIG.BASE_PRICE *
      (1 + totalPurchased * SKILL_CHIP_CONFIG.PRICE_MULTIPLIER)
  );
}

// 计算升级所需芯片数
function chipsNeededForUpgrade(currentLevel: number): number {
  return currentLevel * SKILL_CHIP_CONFIG.CHIPS_PER_LEVEL;
}

// 获取所有技能及用户已有技能等级
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const userId = session.user.id;

    // 并行获取全部技能、用户已有技能、用户芯片购买次数
    const [allSkills, userSkills, user] = await Promise.all([
      getAllSkills(),
      getUserSkills(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { totalChipsPurchased: true, balance: true },
      }),
    ]);

    const chipPrice = calculateChipPrice(user?.totalChipsPurchased ?? 0);

    // 将用户技能等级映射到技能列表
    const userSkillMap = new Map(
      userSkills.map((us: any) => [us.skillId ?? us.id, us])
    );

    const skillsWithLevel = allSkills.map((skill: any) => {
      const userSkill = userSkillMap.get(skill.id);
      const maxLevel = Math.min(skill.maxLevel, SKILL_UPGRADE_CONFIG.MAX_LEVEL);
      const currentLevel = userSkill?.level ?? 0;
      const chipCount = userSkill?.chipCount ?? 0;
      const chipsNeeded = currentLevel > 0 ? chipsNeededForUpgrade(currentLevel) : chipsNeededForUpgrade(1);
      const isMaxed = currentLevel >= maxLevel && !!userSkill;

      return {
        ...skill,
        userLevel: currentLevel,
        acquired: !!userSkill,
        acquiredAt: userSkill?.acquiredAt ?? null,
        chipCount,
        chipsNeeded,
        isMaxed,
        maxLevel,
      };
    });

    return successResponse({
      skills: skillsWithLevel,
      totalSkills: skillsWithLevel.length,
      acquiredCount: skillsWithLevel.filter((s: any) => s.acquired).length,
      chipPrice,
      balance: user?.balance ?? 0,
    });
  } catch (error) {
    console.error("[SKILLS_LIST_ERROR]", error);
    return serverErrorResponse("获取技能列表失败");
  }
}
