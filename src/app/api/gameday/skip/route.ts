import { auth } from "@/auth";
import { redisService } from "@/lib/redis";
import { skipDay, getGameDayInfo } from "@/lib/gameday-service";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// 跳过游戏日（推进到下一个游戏日）
export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;
  const lockKey = `gameday:skip:${userId}`;

  const lockAcquired = await redisService.acquireLock(lockKey, 30);
  if (!lockAcquired && redisService.isAvailable()) {
    return badRequestResponse("操作过于频繁，请稍后再试");
  }

  try {
    const result = await skipDay(userId);

    return successResponse(result, "游戏日已推进");
  } catch (error) {
    console.error("[GAMEDAY_SKIP_ERROR]", error);
    return serverErrorResponse("推进游戏日失败，请稍后重试");
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(lockKey);
    }
  }
}

// 获取当前游戏日信息
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const info = await getGameDayInfo(session.user.id);

    return successResponse(info);
  } catch (error) {
    console.error("[GAMEDAY_INFO_ERROR]", error);
    return serverErrorResponse("获取游戏日信息失败");
  }
}
