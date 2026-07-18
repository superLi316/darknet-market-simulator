import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redisService } from "@/lib/redis";
import { getMarketStories, buyPremiumStory } from "@/lib/market-service";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { z } from "zod";

// 购买付费故事校验
const buyStorySchema = z.object({
  storyId: z.string().min(1),
});

// 市场故事接口
export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(req.url);
  const premium = searchParams.get("premium") === "true";

  try {
    // 获取用户当前游戏日
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { gameDay: true },
    });

    const gameDay = user?.gameDay ?? 1;

    // 获取当日市场故事
    const result = await getMarketStories(gameDay);

    return successResponse({
      gameDay: result.gameDay,
      freeStories: result.freeStories,
      premiumStories: result.premiumStories,
    });
  } catch (error) {
    console.error("[MARKET_STORIES_GET_ERROR]", error);
    return serverErrorResponse("获取市场故事失败");
  }
}

// 购买付费故事提示
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;
  const lockKey = `market:story:buy:${userId}`;

  const lockAcquired = await redisService.acquireLock(lockKey, 30);
  if (!lockAcquired && redisService.isAvailable()) {
    return badRequestResponse("操作过于频繁，请稍后再试");
  }

  try {
    const body = await req.json();
    const { storyId } = buyStorySchema.parse(body);

    // 验证故事存在且为付费故事
    const story = await prisma.marketStory.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return badRequestResponse("故事不存在");
    }

    if (!story.isPremium) {
      return badRequestResponse("该故事为免费故事，无需购买");
    }

    // 调用购买付费故事服务
    const result = await buyPremiumStory(userId, storyId);

    return successResponse(result, "购买付费故事成功");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequestResponse("参数校验失败", error.errors);
    }
    console.error("[MARKET_STORY_BUY_ERROR]", error);
    return serverErrorResponse("购买付费故事失败");
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(lockKey);
    }
  }
}
