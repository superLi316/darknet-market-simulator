import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { successResponse, notFoundResponse, unauthorizedResponse } from "@/lib/api-response";
import { getPriceHistory } from "@/lib/price-service";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const item = await prisma.item.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    return notFoundResponse("商品不存在");
  }

  const hasPriceInsight = session.user.personality === "CAUTIOUS";

  const history = hasPriceInsight
    ? await getPriceHistory(params.id, 7)
    : [];

  return successResponse({
    item,
    priceHistory: history,
    hasPriceInsight,
  });
}
