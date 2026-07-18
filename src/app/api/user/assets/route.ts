import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// 获取用户资产历史记录，用于绘制资产变化图表
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const userId = session.user.id;

    // 按游戏日升序返回历史资产
    const assetHistory = await prisma.assetHistory.findMany({
      where: { userId },
      orderBy: { gameDay: "asc" },
    });

    return successResponse({
      history: assetHistory,
      total: assetHistory.length,
    });
  } catch (error) {
    console.error("[ASSETS_HISTORY_ERROR]", error);
    return serverErrorResponse("获取资产历史失败");
  }
}
