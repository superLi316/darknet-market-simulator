import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redisService } from "@/lib/redis";
import { successResponse, badRequestResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";
import { z } from "zod";

const buySchema = z.object({
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
    const { itemId, quantity } = buySchema.parse(body);

    const userId = session.user.id;
    const lockKey = `trade:buy:${userId}`;

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

      const totalCost = item.currentPrice * quantity;

      if (user.balance < totalCost) {
        return badRequestResponse(`货币不足，需要 ${totalCost.toFixed(0)} 货币`);
      }

      let expiresAt: Date | null = null;
      if (item.category === "FOOD" || item.category === "WATER") {
        if (item.shelfLifeDays) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + item.shelfLifeDays);
        }
      }

      const [transaction, inventoryItem, updatedUser, updatedItem] =
        await prisma.$transaction([
          prisma.transaction.create({
            data: {
              userId,
              itemId,
              type: "BUY",
              quantity,
              unitPrice: item.currentPrice,
              totalAmount: totalCost,
              priceAtTrade: item.currentPrice,
              basePriceAtTrade: item.basePrice,
            },
          }),
          prisma.inventoryItem.create({
            data: {
              userId,
              itemId,
              quantity,
              buyPrice: item.currentPrice,
              expiresAt,
            },
            include: { item: true },
          }),
          prisma.user.update({
            where: { id: userId },
            data: {
              balance: { decrement: totalCost },
              totalSpent: { increment: totalCost },
              tradeCount: { increment: 1 },
            },
          }),
          prisma.item.update({
            where: { id: itemId },
            data: {
              buyVolume24h: { increment: quantity },
              tradeCount24h: { increment: 1 },
            },
          }),
        ]);

      await redisService.del("market:prices");

      return successResponse({
        transaction,
        inventoryItem,
        totalCost,
        remainingBalance: updatedUser.balance,
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
    console.error("[BUY_ERROR]", error);
    return serverErrorResponse("购买失败，请稍后重试");
  }
}
