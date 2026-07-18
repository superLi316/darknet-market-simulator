import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redisService } from "@/lib/redis";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { z } from "zod";

// 头像校验：支持预设 avatar1~avatar20、URL、或 base64 data URL
const avatarSchema = z.object({
  avatar: z
    .string()
    .min(1, "头像不能为空")
    .max(500000, "头像数据过大")
    .refine(
      (val) => {
        // 预设头像
        if (/^avatar([1-9]|1[0-9]|20)$/.test(val)) return true;
        // base64 data URL
        if (val.startsWith("data:image/")) return true;
        // http/https URL
        if (val.startsWith("http://") || val.startsWith("https://")) return true;
        return false;
      },
      { message: "头像格式无效，请使用预设头像、图片URL或上传图片" }
    ),
});

// 更换用户头像
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;
  const lockKey = `user:avatar:${userId}`;

  const lockAcquired = await redisService.acquireLock(lockKey, 30);
  if (!lockAcquired && redisService.isAvailable()) {
    return badRequestResponse("操作过于频繁，请稍后再试");
  }

  try {
    const body = await req.json();
    const { avatar } = avatarSchema.parse(body);

    // 更新用户头像字段
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    });

    return successResponse(updatedUser, "头像更换成功");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequestResponse("参数校验失败", error.errors);
    }
    console.error("[AVATAR_UPDATE_ERROR]", error);
    return serverErrorResponse("更换头像失败，请稍后重试");
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(lockKey);
    }
  }
}