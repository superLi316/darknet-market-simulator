import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { processDailySettlement } from "@/lib/settlement-service";
import { updateAllPrices } from "@/lib/price-service";
import { successResponse, forbiddenResponse, unauthorizedResponse } from "@/lib/api-response";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  if (session.user.role !== "ADMIN") {
    return forbiddenResponse("仅管理员可执行此操作");
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "settlement";

  try {
    if (type === "settlement") {
      const result = await processDailySettlement();
      return successResponse(result);
    } else if (type === "prices") {
      const result = await updateAllPrices();
      return successResponse(result);
    } else {
      return NextResponse.json(
        { code: 400, message: "未知操作类型", data: null, timestamp: Date.now() },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[CRON_ERROR]", error);
    return NextResponse.json(
      { code: 500, message: "执行失败", data: null, timestamp: Date.now() },
      { status: 500 }
    );
  }
}
