import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redisService } from "@/lib/redis";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { executeWorkWithCrit } from "@/lib/work-service";
import { z } from "zod";

const workSchema = z.object({
  workType: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { workType } = workSchema.parse(body);

    // 检查劳动类型是否存在
    const workConfig = await prisma.workTypeConfig.findUnique({
      where: { workType },
    });

    if (!workConfig || !workConfig.isActive) {
      return badRequestResponse("劳动类型不存在或已停用");
    }

    const userId = session.user.id;
    const lockKey = `work:${userId}:${workType}`;

    const lockAcquired = await redisService.acquireLock(lockKey, 30);
    if (!lockAcquired && redisService.isAvailable()) {
      return badRequestResponse("操作过于频繁，请稍后再试");
    }

    try {
      // 检查冷却时间
      const lastWorkRecord = await prisma.workRecord.findFirst({
        where: {
          userId,
          workType,
          completedAt: {
            gte: new Date(
              Date.now() - workConfig.cooldownMinutes * 60 * 1000
            ),
          },
        },
        orderBy: { completedAt: "desc" },
      });

      if (lastWorkRecord) {
        const cooldownEnd = new Date(
          lastWorkRecord.completedAt.getTime() +
            workConfig.cooldownMinutes * 60 * 1000
        );
        const remainingSeconds = Math.ceil(
          (cooldownEnd.getTime() - Date.now()) / 1000
        );
        return badRequestResponse(
          `冷却中，请 ${remainingSeconds} 秒后再试`,
          { cooldownEnd, remainingSeconds }
        );
      }

      // 检查体力
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stamina: true, maxStamina: true, lastStaminaRecover: true },
      });

      if (!user) {
        return badRequestResponse("用户不存在");
      }

      if (user.stamina < workConfig.staminaCost) {
        return badRequestResponse(
          `体力不足，需要 ${workConfig.staminaCost} 点体力`
        );
      }

      // 执行劳动（包含暴击、健康损失、技能升级逻辑）
      const result = await executeWorkWithCrit(userId, workType);

      if (!result.success) {
        return badRequestResponse(result.reason || "劳动失败");
      }

      return successResponse({
        workRecord: result.workRecord,
        earnings: result.earnings,
        baseEarnings: result.baseEarnings,
        staminaCost: result.staminaCost,
        staminaRemaining: result.staminaRemaining,
        healthLoss: result.healthLoss,
        healthRemaining: result.healthRemaining,
        isCritical: result.isCritical,
        critMultiplier: result.critMultiplier,
        critChance: result.critChance,
        skillUpgraded: result.skillUpgraded,
        upgradedSkill: result.upgradedSkill,
      });
    } finally {
      if (redisService.isAvailable()) {
        await redisService.releaseLock(lockKey);
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequestResponse("参数校验失败", error.errors);
    }
    console.error("[WORK_ERROR]", error);
    return serverErrorResponse("劳动失败，请稍后重试");
  }
}
