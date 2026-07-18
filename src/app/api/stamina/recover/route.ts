import { auth } from "@/auth";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";
import {
  recoverStamina,
  getRecoverProgress,
  staminaConstants,
} from "@/lib/stamina-service";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const result = await recoverStamina(session.user.id);

  return successResponse({
    ...result,
    recoverProgress: getRecoverProgress(
      new Date(Date.now() - staminaConstants.recoverIntervalMs)
    ),
    intervalMs: staminaConstants.recoverIntervalMs,
    recoverAmount: staminaConstants.recoverAmount,
  });
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      stamina: true,
      maxStamina: true,
      lastStaminaRecover: true,
    },
  });

  if (!user) {
    return unauthorizedResponse();
  }

  return successResponse({
    currentStamina: user.stamina,
    maxStamina: user.maxStamina,
    nextRecoverTime: new Date(
      user.lastStaminaRecover.getTime() + staminaConstants.recoverIntervalMs
    ),
    recoverProgress: getRecoverProgress(user.lastStaminaRecover),
    intervalMs: staminaConstants.recoverIntervalMs,
    recoverAmount: staminaConstants.recoverAmount,
  });
}
