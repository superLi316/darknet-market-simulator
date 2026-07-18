import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { z } from "zod";

// 交易记录查询参数校验
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["BUY", "SELL", "CONSUME"]).optional(),
});

// 获取用户交易记录，支持分页与类型筛选
export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { page, limit, type } = querySchema.parse(queryParams);

    const userId = session.user.id;
    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    // 并行查询数据与总数
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse({
      items: transactions,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequestResponse("参数校验失败", error.errors);
    }
    console.error("[TRANSACTIONS_ERROR]", error);
    return serverErrorResponse("获取交易记录失败");
  }
}
