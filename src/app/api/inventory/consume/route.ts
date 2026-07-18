import { auth } from "@/auth";
import { redisService } from "@/lib/redis";
import { consumeItem } from "@/lib/consume-service";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { z } from "zod";

// 消耗食品校验
const consumeSchema = z.object({
  inventoryItemId: z.string().min(1),
});

// 消耗库存中的食品
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;
  const lockKey = `inventory:consume:${userId}`;

  const lockAcquired = await redisService.acquireLock(lockKey, 30);
  if (!lockAcquired && redisService.isAvailable()) {
    return badRequestResponse("操作过于频繁，请稍后再试");
  }

  try {
    const body = await req.json();
    const { inventoryItemId } = consumeSchema.parse(body);

    // 调用消耗物品服务
    const result = await consumeItem(userId, inventoryItemId);

    return successResponse(result, "消耗成功");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequestResponse("参数校验失败", error.errors);
    }
    console.error("[CONSUME_ERROR]", error);
    return serverErrorResponse("消耗失败，请稍后重试");
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(lockKey);
    }
  }
}
