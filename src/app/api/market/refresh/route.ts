import { auth } from "@/auth";
import { redisService } from "@/lib/redis";
import { refreshMarket } from "@/lib/market-service";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// 黑市刷新接口
export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;
  const lockKey = `market:refresh:${userId}`;

  // 加锁防止重复刷新
  const lockAcquired = await redisService.acquireLock(lockKey, 30);
  if (!lockAcquired && redisService.isAvailable()) {
    return badRequestResponse("操作过于频繁，请稍后再试");
  }

  try {
    // 调用市场刷新服务，返回新商品列表与刷新费用
    const result = await refreshMarket(userId);

    return successResponse(result, "黑市刷新成功");
  } catch (error) {
    console.error("[MARKET_REFRESH_ERROR]", error);
    return serverErrorResponse("黑市刷新失败，请稍后重试");
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(lockKey);
    }
  }
}
