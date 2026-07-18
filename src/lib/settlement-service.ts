import { prisma } from "@/lib/db";
import { redisService } from "@/lib/redis";
import { PERSONALITY_CONFIG, DAILY_CONSUMPTION } from "@/types";
import type { PersonalityType } from "@/types";

const DAILY_SETTLEMENT_LOCK_KEY = "settlement:daily:lock";

export interface SettlementResult {
  userId: string;
  username: string;
  survived: boolean;
  startingHealth: number;
  endingHealth: number;
  waterConsumed: number;
  foodConsumed: number;
  waterDeficit: number;
  foodDeficit: number;
  healthLost: number;
  deathReason?: string;
  itemsCleared?: boolean;
}

export async function processDailySettlement(): Promise<{
  totalPlayers: number;
  survived: number;
  died: number;
  results: SettlementResult[];
}> {
  const lockAcquired = await redisService.acquireLock(
    DAILY_SETTLEMENT_LOCK_KEY,
    600
  );

  if (!lockAcquired && redisService.isAvailable()) {
    return { totalPlayers: 0, survived: 0, died: 0, results: [] };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alivePlayers = await prisma.user.findMany({
      where: { status: "ALIVE" },
      include: {
        inventory: {
          include: { item: true },
          orderBy: { expiresAt: "asc" },
        },
      },
    });

    const results: SettlementResult[] = [];
    let survivedCount = 0;
    let diedCount = 0;

    for (const player of alivePlayers) {
      const result = await settlePlayer(player, today);
      results.push(result);
      if (result.survived) {
        survivedCount++;
      } else {
        diedCount++;
      }
    }

    await prisma.item.updateMany({
      data: {
        buyVolume24h: 0,
        sellVolume24h: 0,
        tradeCount24h: 0,
      },
    });

    return {
      totalPlayers: alivePlayers.length,
      survived: survivedCount,
      died: diedCount,
      results,
    };
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(DAILY_SETTLEMENT_LOCK_KEY);
    }
  }
}

async function settlePlayer(
  player: any,
  settlementDate: Date
): Promise<SettlementResult> {
  const personalityConfig = PERSONALITY_CONFIG[player.personality as PersonalityType];
  const consumptionMultiplier = personalityConfig.consumptionMultiplier;

  // 食品饮料合并为 CONSUMABLE，每日需要消耗的总数量
  const consumableNeeded = Math.max(1, Math.round(DAILY_CONSUMPTION.CONSUMABLE * consumptionMultiplier));

  let consumableConsumed = 0;
  let itemsCleared = false;

  // 所有消耗品（食品和饮料合并）
  const consumableItems = player.inventory.filter(
    (inv: any) => inv.item.category === "CONSUMABLE" && inv.quantity > 0
  );

  const expiredItems = player.inventory.filter(
    (inv: any) =>
      inv.expiresAt && new Date(inv.expiresAt) < settlementDate && inv.quantity > 0
  );

  if (personalityConfig.isRandom && Math.random() < personalityConfig.itemClearChance) {
    itemsCleared = true;
  }

  let consumableRemaining = consumableNeeded;
  const consumableUpdates: any[] = [];

  for (const inv of consumableItems) {
    if (consumableRemaining <= 0) break;
    if (itemsCleared) continue;
    if (inv.expiresAt && new Date(inv.expiresAt) < settlementDate) continue;

    const take = Math.min(inv.quantity, consumableRemaining);
    consumableConsumed += take;
    consumableRemaining -= take;
    consumableUpdates.push({ id: inv.id, decrement: take });
  }

  const consumableDeficit = consumableNeeded - consumableConsumed;

  let healthLost = 0;
  if (consumableDeficit > 0) {
    healthLost += DAILY_CONSUMPTION.HEALTH_PENALTY * consumableDeficit;
  }

  const newHealth = Math.max(0, player.health - healthLost);
  const survived = newHealth > 0;

  const allUpdates = [...consumableUpdates];

  await prisma.$transaction(async (tx) => {
    for (const update of allUpdates) {
      await tx.inventoryItem.update({
        where: { id: update.id },
        data: { quantity: { decrement: update.decrement } },
      });
    }

    if (expiredItems.length > 0 && !itemsCleared) {
      await tx.inventoryItem.deleteMany({
        where: {
          id: { in: expiredItems.map((i: any) => i.id) },
        },
      });
    }

    if (itemsCleared) {
      await tx.inventoryItem.deleteMany({
        where: { userId: player.id },
      });
    }

    await tx.inventoryItem.deleteMany({
      where: { userId: player.id, quantity: 0 },
    });

    await tx.dailySettlement.create({
      data: {
        userId: player.id,
        settlementDate,
        startingHealth: player.health,
        endingHealth: newHealth,
        waterConsumed: 0,
        foodConsumed: consumableConsumed,
        waterDeficit: 0,
        foodDeficit: consumableDeficit,
        healthLost,
        survived,
      },
    });

    if (survived) {
      await tx.user.update({
        where: { id: player.id },
        data: {
          health: newHealth,
          survivalDays: { increment: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId: player.id,
          type: "SYSTEM",
          title: "每日结算完成",
          content: `消耗物资 ${consumableConsumed}/${consumableNeeded}。健康值 ${player.health} → ${newHealth}。${itemsCleared ? "⚠️ 你的物资被清空了！" : ""}`,
        },
      });
    } else {
      const deathReason = consumableDeficit > 0
        ? "因缺乏物资而死亡"
        : "未知原因";

      await tx.user.update({
        where: { id: player.id },
        data: {
          health: 0,
          status: "DEAD",
          deathReason,
          diedAt: new Date(),
          deathCount: { increment: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId: player.id,
          type: "DEATH",
          title: "系统清除",
          content: `${deathReason}。你存活了 ${player.survivalDays + 1} 天，累计赚取 ${player.totalEarned.toFixed(0)} 货币。你可以消耗货币复活或等待冷却期后重新开始。`,
        },
      });
    }
  });

  return {
    userId: player.id,
    username: player.username,
    survived,
    startingHealth: player.health,
    endingHealth: newHealth,
    waterConsumed: 0,
    foodConsumed: consumableConsumed,
    waterDeficit: 0,
    foodDeficit: consumableDeficit,
    healthLost,
    deathReason: survived ? undefined : (
      consumableDeficit > 0
        ? "因缺乏物资而死亡"
        : "未知原因"
    ),
    itemsCleared,
  };
}
