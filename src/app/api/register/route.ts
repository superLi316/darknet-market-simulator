import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6),
});

const PERSONALITIES = [
  "HARDWORKING",
  "LAZY",
  "SPECULATOR",
  "CAUTIOUS",
  "CRAZY",
] as const;

function assignRandomPersonality(): string {
  const randomIndex = Math.floor(Math.random() * PERSONALITIES.length);
  return PERSONALITIES[randomIndex];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { username: validated.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { code: 400, message: "用户名已存在", data: null, timestamp: Date.now() },
        { status: 400 }
      );
    }

    if (validated.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: validated.email },
      });

      if (existingEmail) {
        return NextResponse.json(
          { code: 400, message: "邮箱已被使用", data: null, timestamp: Date.now() },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(validated.password, 12);
    const personality = assignRandomPersonality();

    const user = await prisma.user.create({
      data: {
        username: validated.username,
        email: validated.email || null,
        passwordHash,
        personality,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "欢迎来到暗网",
        content: `你的性格是 ${personality}，记住，生存是第一要务。初始资金 100 货币，请合理规划。`,
      },
    });

    return NextResponse.json({
      code: 200,
      message: "注册成功",
      data: {
        userId: user.id,
        username: user.username,
        personality,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: 400, message: "参数校验失败", data: error.errors, timestamp: Date.now() },
        { status: 400 }
      );
    }

    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { code: 500, message: "服务器内部错误", data: null, timestamp: Date.now() },
      { status: 500 }
    );
  }
}
