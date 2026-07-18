import { auth } from "@/auth";
import { checkAchievements, getAchievements } from "@/lib/achievement-service";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// 成就列表接口：同时检查并更新成就进度
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const userId = session.user.id;

    // 先检查并更新成就进度
    await checkAchievements(userId);

    // 获取最新成就列表（含完成状态）
    const achievements = await getAchievements(userId);

    return successResponse(achievements);
  } catch (error) {
    console.error("[ACHIEVEMENTS_ERROR]", error);
    return serverErrorResponse("获取成就列表失败");
  }
}
