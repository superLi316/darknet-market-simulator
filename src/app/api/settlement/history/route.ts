import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const latestSettlement = await prisma.dailySettlement.findFirst({
    where: { userId: session.user.id },
    orderBy: { settlementDate: "desc" },
  });

  const settlementCount = await prisma.dailySettlement.count({
    where: { userId: session.user.id },
  });

  return successResponse({
    latestSettlement,
    totalSettlements: settlementCount,
  });
}
