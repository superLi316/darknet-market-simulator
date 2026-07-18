import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redisService } from "@/lib/redis";
import { getTitles, activateTitle } from "@/lib/achievement-service";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { z } from "zod";

// 激活头衔校验
const activateTitleSchema = z.object({
  titleId: z.string().min(1),
});

// 获取用户所有头衔及当前激活头衔
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { titles } = await getTitles(session.user.id);

    // 查询当前激活的头衔
    const activePlayerTitle = await prisma.playerTitle.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: { title: true },
    });

    // 格式化 activeTitle 为前端期望的扁平结构
    const activeTitle = activePlayerTitle ? {
      id: activePlayerTitle.id,
      titleId: activePlayerTitle.titleId,
      code: activePlayerTitle.title.code,
      name: activePlayerTitle.title.name,
      description: activePlayerTitle.title.description,
      buffType: activePlayerTitle.title.buffType,
      buffValue: activePlayerTitle.title.buffValue,
      rarity: activePlayerTitle.title.rarity,
      isActive: true,
      acquiredAt: activePlayerTitle.acquiredAt,
    } : null;

    return successResponse({
      titles,
      activeTitleId: activePlayerTitle?.titleId ?? null,
      activeTitle,
    });
  } catch (error) {
    console.error("[TITLES_GET_ERROR]", error);
    return serverErrorResponse("获取头衔列表失败");
  }
}

// 激活头衔
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;
  const lockKey = `title:activate:${userId}`;

  const lockAcquired = await redisService.acquireLock(lockKey, 30);
  if (!lockAcquired && redisService.isAvailable()) {
    return badRequestResponse("操作过于频繁，请稍后再试");
  }

  try {
    const body = await req.json();
    const { titleId } = activateTitleSchema.parse(body);

    // 验证用户是否拥有该头衔
    const playerTitle = await prisma.playerTitle.findUnique({
      where: {
        userId_titleId: {
          userId,
          titleId,
        },
      },
    });

    if (!playerTitle) {
      return badRequestResponse("未拥有该头衔");
    }

    // 调用激活头衔服务
    const result = await activateTitle(userId, titleId);

    return successResponse(result, "头衔激活成功");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequestResponse("参数校验失败", error.errors);
    }
    console.error("[TITLE_ACTIVATE_ERROR]", error);
    return serverErrorResponse("激活头衔失败，请稍后重试");
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(lockKey);
    }
  }
}
