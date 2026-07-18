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
import bcrypt from "bcryptjs";

// 修改密码参数校验
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(6, "新密码长度至少 6 位").max(64, "新密码长度不能超过 64 位"),
});

// 修改用户密码
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;
  const lockKey = `user:password:${userId}`;

  const lockAcquired = await redisService.acquireLock(lockKey, 30);
  if (!lockAcquired && redisService.isAvailable()) {
    return badRequestResponse("操作过于频繁，请稍后再试");
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = passwordSchema.parse(body);

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return badRequestResponse("用户不存在");
    }

    // 验证旧密码
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return badRequestResponse("当前密码不正确");
    }

    // 新密码不能与旧密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return badRequestResponse("新密码不能与当前密码相同");
    }

    // 加密新密码并更新
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return successResponse(null, "密码修改成功");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequestResponse("参数校验失败", error.errors);
    }
    console.error("[PASSWORD_CHANGE_ERROR]", error);
    return serverErrorResponse("修改密码失败，请稍后重试");
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(lockKey);
    }
  }
}
