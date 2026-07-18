import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redisService } from "@/lib/redis";
import { SKILL_CHIP_CONFIG, SKILL_UPGRADE_CONFIG } from "@/types";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { z } from "zod";

const buyChipSchema = z.object({
  skillId: z.string().min(1),
});

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

// 购买技能芯片
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;
  const lockKey = `skill:chip:${userId}`;

  const lockAcquired = await redisService.acquireLock(lockKey, 30);
  if (!lockAcquired && redisService.isAvailable()) {
    return badRequestResponse("操作过于频繁，请稍后再试");
  }

  try {
    const body = await req.json();
    const { skillId } = buyChipSchema.parse(body);

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, totalChipsPurchased: true },
    });

    if (!user) {
      return badRequestResponse("用户不存在");
    }

    // 获取技能定义
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill || !skill.isActive) {
      return badRequestResponse("技能不存在或已禁用");
    }

    const maxLevel = Math.min(skill.maxLevel, SKILL_UPGRADE_CONFIG.MAX_LEVEL);

    // 获取或创建用户技能记录
    let userSkill = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });

    // 如果已满级
    if (userSkill && userSkill.level >= maxLevel) {
      return badRequestResponse("技能已满级，无法继续购买芯片");
    }

    // 计算当前芯片价格
    const chipPrice = calculateChipPrice(user.totalChipsPurchased);

    // 检查余额
    if (user.balance < chipPrice) {
      return badRequestResponse(
        `余额不足，芯片价格 ${chipPrice}，当前余额 ${user.balance.toFixed(0)}`
      );
    }

    const currentLevel = userSkill?.level ?? 1;
    const needed = chipsNeededForUpgrade(currentLevel);

    // 使用事务操作
    const result = await prisma.$transaction(async (tx) => {
      // 扣除余额
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: chipPrice },
          totalSpent: { increment: chipPrice },
          totalChipsPurchased: { increment: 1 },
        },
      });

      let newChipCount: number;
      let newLevel: number;
      let upgraded = false;

      if (!userSkill) {
        // 首次购买芯片 - 创建 UserSkill 记录
        newChipCount = 1;
        newLevel = 1;
        if (newChipCount >= needed) {
          newLevel = 2;
          newChipCount = 0;
          upgraded = true;
        }

        userSkill = await tx.userSkill.create({
          data: {
            userId,
            skillId,
            level: newLevel,
            chipCount: newChipCount,
          },
        });
      } else {
        // 已有技能记录，增加芯片计数
        newChipCount = userSkill.chipCount + 1;
        newLevel = userSkill.level;
        if (newChipCount >= needed) {
          newLevel = Math.min(userSkill.level + 1, maxLevel);
          newChipCount = 0;
          upgraded = true;
        }

        userSkill = await tx.userSkill.update({
          where: { id: userSkill.id },
          data: {
            chipCount: newChipCount,
            level: newLevel,
          },
        });
      }

      // 记录交易
      await tx.transaction.create({
        data: {
          userId,
          itemId: skillId,
          type: "BUY",
          quantity: 1,
          unitPrice: chipPrice,
          totalAmount: chipPrice,
          priceAtTrade: chipPrice,
          basePriceAtTrade: SKILL_CHIP_CONFIG.BASE_PRICE,
          timestamp: new Date(),
        },
      });

      // 发送通知
      if (upgraded) {
        await tx.notification.create({
          data: {
            userId,
            type: "SKILL_UP",
            title: "技能升级",
            content: `技能「${skill.name}」已升级至 Lv.${newLevel}！`,
          },
        });
      }

      return {
        chipPrice,
        newChipCount,
        newLevel,
        upgraded,
        chipsNeeded: chipsNeededForUpgrade(newLevel),
        nextChipPrice: calculateChipPrice(user.totalChipsPurchased + 1),
      };
    });

    const message = result.upgraded
      ? `芯片购买成功！技能「${skill.name}」已升级至 Lv.${result.newLevel}！`
      : `芯片购买成功！当前芯片进度 ${result.newChipCount}/${result.chipsNeeded}`;

    return successResponse(
      {
        ...result,
        skillName: skill.name,
      },
      message
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequestResponse("参数校验失败", error.errors);
    }
    console.error("[BUY_CHIP_ERROR]", error);
    return serverErrorResponse("购买芯片失败，请稍后重试");
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(lockKey);
    }
  }
}