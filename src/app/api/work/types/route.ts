import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";
import { WORK_TYPE_CONFIG } from "@/types";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const workTypes = await prisma.workTypeConfig.findMany({
    where: { isActive: true },
    orderBy: { basePay: "asc" },
  });

  return successResponse(workTypes);
}
