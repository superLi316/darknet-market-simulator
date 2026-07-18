import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";
import { getPriceHint } from "@/lib/economy";

export async function GET(req: Request) {
  const session = await auth();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const where: any = { isActive: true };
  if (category) {
    where.category = category;
  }

  const items = await prisma.item.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });

  const hasPriceInsight = session?.user?.personality === "CAUTIOUS";

  const itemsWithHint = items.map((item) => {
    const hint = getPriceHint(item.currentPrice, item.basePrice, hasPriceInsight);
    return {
      ...item,
      priceHint: hint.hint,
      priceTrend: hint.trend,
      priceRatio: hint.ratio,
      changePercent: ((item.currentPrice - item.basePrice) / item.basePrice) * 100,
    };
  });

  return successResponse(itemsWithHint);
}
