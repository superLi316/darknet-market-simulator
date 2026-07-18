import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getLeaderboard, initializeNpcs } from "@/lib/npc-service";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// 排行榜接口：首次访问时自动初始化 NPC
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    // 检查是否已有 NPC，没有则初始化
    const npcCount = await prisma.user.count({
      where: { role: "NPC" },
    });

    if (npcCount === 0) {
      await initializeNpcs();
    }

    const leaderboard = await getLeaderboard(session.user.id);

    return successResponse(leaderboard);
  } catch (error) {
    console.error("[LEADERBOARD_ERROR]", error);
    return serverErrorResponse("获取排行榜失败");
  }
}
