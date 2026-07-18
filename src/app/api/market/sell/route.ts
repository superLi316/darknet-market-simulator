import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redisService } from "@/lib/redis";
import { successResponse, badRequestResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";
import { processFifoSell } from "@/lib/economy";
import type { PersonalityType } from "@/types";
import { z } from "zod";

const sellSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().positive().max(100),
});

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { itemId, quantity } = sellSchema.parse(body);

    const userId = session.user.id;
    const lockKey = `trade:sell:${userId}`;

    const lockAcquired = await redisService.acquireLock(lockKey, 30);
    if (!lockAcquired && redisService.isAvailable()) {
      return badRequestResponse("操作过于频繁，请稍后再试");
    }

    try {
      const item = await prisma.item.findUnique({ where: { id: itemId } });

      if (!item || !item.isActive) {
        return badRequestResponse("商品不存在或已下架");
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user || user.status !== "ALIVE") {
        return badRequestResponse("用户状态异常");
      }

      const inventoryItems = await prisma.inventoryItem.findMany({
        where: {
          userId,
          itemId,
          quantity: { gt: 0 },
        },
        orderBy: { purchaseDate: "asc" },
      });

      const totalInventory = inventoryItems.reduce(
        (sum, inv) => sum + inv.quantity,
        0
      );

      if (totalInventory < quantity) {
        return badRequestResponse(`库存不足，当前持有 ${totalInventory} 个`);
      }

      const fifoResult = processFifoSell(
        inventoryItems.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          buyPrice: i.buyPrice,
          purchaseDate: i.purchaseDate,
        })),
        quantity,
        item.currentPrice,
        user.personality as PersonalityType
      );

      if (fifoResult.remainingQuantity > 0) {
        return badRequestResponse("库存不足");
      }

      const totalRevenue = fifoResult.totalRevenue;
      const totalProfit = fifoResult.totalProfit;

      const transactionOps = fifoResult.matchedLots.map((lot) =>
        prisma.inventoryItem.update({
          where: { id: lot.inventoryItemId },
          data: { quantity: { decrement: lot.quantity } },
        })
      );

      await prisma.$transaction([
        ...transactionOps,
        prisma.user.update({
          where: { id: userId },
          data: {
            balance: { increment: totalRevenue },
            totalEarned: { increment: totalRevenue },
            totalProfit: totalProfit >= 0 ? { increment: totalProfit } : undefined,
            totalLoss: totalProfit < 0 ? { increment: Math.abs(totalProfit) } : undefined,
            tradeCount: { increment: 1 },
          },
        }),
        prisma.item.update({
          where: { id: itemId },
          data: {
            sellVolume24h: { increment: quantity },
            tradeCount24h: { increment: 1 },
          },
        }),
      ]);

      const transaction = await prisma.transaction.create({
        data: {
          userId,
          itemId,
          type: "SELL",
          quantity,
          unitPrice: item.currentPrice,
          totalAmount: totalRevenue,
          profitLoss: totalProfit,
          priceAtTrade: item.currentPrice,
          basePriceAtTrade: item.basePrice,
          fifoMatches: JSON.stringify(fifoResult.matchedLots),
        },
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      await prisma.inventoryItem.deleteMany({
        where: {
          userId,
          itemId,
          quantity: 0,
        },
      });

      await redisService.del("market:prices");

      return successResponse({
        transaction,
        totalRevenue,
        totalProfit,
        remainingBalance: updatedUser?.balance ?? user.balance + totalRevenue,
        matchedLots: fifoResult.matchedLots,
        profitPercent:
          fifoResult.totalCost > 0
            ? (totalProfit / fifoResult.totalCost) * 100
            : 0,
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
    console.error("[SELL_ERROR]", error);
    return serverErrorResponse("出售失败，请稍后重试");
  }
}
