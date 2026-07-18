import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";
import { calculateStaminaRecovery } from "@/lib/economy";
import { WORK_CRIT_CONFIG } from "@/types";
import { clamp } from "@/lib/utils";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;

  const [user, workRecords, userSkills] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
    }),
    prisma.workRecord.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
    prisma.userSkill.findMany({
      where: { userId },
      select: { level: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json(
      { code: 404, message: "用户不存在", data: null, timestamp: Date.now() },
      { status: 404 }
    );
  }

  // 计算当前暴击率：BASE_CRIT_CHANCE + (总技能等级 * SKILL_CRIT_BONUS)，上限 0.75
  const totalSkillLevel = userSkills.reduce((sum, us) => sum + us.level, 0);
  const critChance = clamp(
    WORK_CRIT_CONFIG.BASE_CRIT_CHANCE +
      totalSkillLevel * WORK_CRIT_CONFIG.SKILL_CRIT_BONUS,
    0,
    0.75
  );

  const staminaRecovery = calculateStaminaRecovery(
    user.lastStaminaRecover,
    user.maxStamina,
    user.stamina
  );

  const cooldowns: Record<string, { remaining: number; endTime: Date | null }> = {};
  const workTypes = ["CARRYING", "DELIVERY", "HACKING", "MINING", "FORGERY"];
  
  for (const wt of workTypes) {
    const workConfig = await prisma.workTypeConfig.findUnique({
      where: { workType: wt as any },
    });
    if (!workConfig) continue;

    const lastRecord = await prisma.workRecord.findFirst({
      where: {
        userId,
        workType: wt as any,
        completedAt: {
          gte: new Date(Date.now() - workConfig.cooldownMinutes * 60 * 1000),
        },
      },
      orderBy: { completedAt: "desc" },
    });

    if (lastRecord) {
      const endTime = new Date(
        lastRecord.completedAt.getTime() + workConfig.cooldownMinutes * 60 * 1000
      );
      cooldowns[wt] = {
        remaining: Math.max(0, Math.ceil((endTime.getTime() - Date.now()) / 1000)),
        endTime,
      };
    } else {
      cooldowns[wt] = { remaining: 0, endTime: null };
    }
  }

  return successResponse({
    currentStamina: staminaRecovery.newStamina,
    maxStamina: user.maxStamina,
    nextRecoveryAt: staminaRecovery.nextRecoverAt,
    recovered: staminaRecovery.recovered,
    cooldowns,
    recentRecords: workRecords,
    critChance,
  });
}
