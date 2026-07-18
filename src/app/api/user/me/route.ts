import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      personality: true,
      balance: true,
      health: true,
      stamina: true,
      maxStamina: true,
      survivalDays: true,
      smallTrophies: true,
      largeTrophies: true,
      totalEarned: true,
      totalSpent: true,
      totalProfit: true,
      tradeCount: true,
      workCount: true,
      createdAt: true,
      avatar: true,
      gameDay: true,
      deathCount: true,
      diedAt: true,
      deathReason: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { code: 404, message: "用户不存在", data: null, timestamp: Date.now() },
      { status: 404 }
    );
  }

  return successResponse(user);
}
