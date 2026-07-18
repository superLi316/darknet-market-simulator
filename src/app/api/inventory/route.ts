import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;

  const inventory = await prisma.inventoryItem.findMany({
    where: {
      userId,
      quantity: { gt: 0 },
    },
    include: {
      item: true,
    },
    orderBy: { purchaseDate: "asc" },
  });

  const grouped = inventory.reduce((acc: any, item) => {
    const key = item.itemId;
    if (!acc[key]) {
      acc[key] = {
        itemId: item.itemId,
        item: item.item,
        totalQuantity: 0,
        averageBuyPrice: 0,
        totalCost: 0,
        lots: [],
      };
    }
    acc[key].totalQuantity += item.quantity;
    acc[key].totalCost += item.buyPrice * item.quantity;
    acc[key].lots.push({
      id: item.id,
      quantity: item.quantity,
      buyPrice: item.buyPrice,
      purchaseDate: item.purchaseDate,
      expiresAt: item.expiresAt,
    });
    return acc;
  }, {});

  const result = Object.values(grouped).map((group: any) => ({
    ...group,
    averageBuyPrice: group.totalQuantity > 0 ? group.totalCost / group.totalQuantity : 0,
    currentValue: group.totalQuantity * group.item.currentPrice,
    profitLoss: group.totalQuantity * group.item.currentPrice - group.totalCost,
    profitPercent:
      group.totalCost > 0
        ? ((group.totalQuantity * group.item.currentPrice - group.totalCost) /
            group.totalCost) *
          100
        : 0,
  }));

  return successResponse({
    items: result,
    totalValue: result.reduce((sum: number, item: any) => sum + item.currentValue, 0),
    totalCost: result.reduce((sum: number, item: any) => sum + item.totalCost, 0),
    totalProfit: result.reduce((sum: number, item: any) => sum + item.profitLoss, 0),
  });
}
