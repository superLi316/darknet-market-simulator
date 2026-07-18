import { prisma } from "./db";
import { calculateStaminaRecovery } from "./economy";

const STAMINA_RECOVER_INTERVAL_MINUTES = 10;
const STAMINA_RECOVER_AMOUNT = 10;

export async function recoverStamina(userId: string): Promise<{
  recovered: number;
  currentStamina: number;
  maxStamina: number;
  nextRecoverAt: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stamina: true,
      maxStamina: true,
      lastStaminaRecover: true,
    },
  });

  if (!user) {
    return {
      recovered: 0,
      currentStamina: 0,
      maxStamina: 100,
      nextRecoverAt: new Date(),
    };
  }

  if (user.stamina >= user.maxStamina) {
    return {
      recovered: 0,
      currentStamina: user.stamina,
      maxStamina: user.maxStamina,
      nextRecoverAt: new Date(
        user.lastStaminaRecover.getTime() +
          STAMINA_RECOVER_INTERVAL_MINUTES * 60 * 1000
      ),
    };
  }

  const result = calculateStaminaRecovery(
    user.lastStaminaRecover,
    user.maxStamina,
    user.stamina,
    STAMINA_RECOVER_AMOUNT,
    STAMINA_RECOVER_INTERVAL_MINUTES
  );

  if (result.recovered > 0) {
    const intervals = Math.floor(
      (Date.now() - user.lastStaminaRecover.getTime()) /
        (STAMINA_RECOVER_INTERVAL_MINUTES * 60 * 1000)
    );
    const newLastRecover = new Date(
      user.lastStaminaRecover.getTime() +
        intervals * STAMINA_RECOVER_INTERVAL_MINUTES * 60 * 1000
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        stamina: result.newStamina,
        lastStaminaRecover: newLastRecover,
      },
    });
  }

  return {
    recovered: result.recovered,
    currentStamina: result.newStamina,
    maxStamina: user.maxStamina,
    nextRecoverAt: result.nextRecoverAt,
  };
}

export function getNextRecoverTime(lastStaminaRecover: Date): Date {
  return new Date(
    lastStaminaRecover.getTime() + STAMINA_RECOVER_INTERVAL_MINUTES * 60 * 1000
  );
}

export function getRecoverProgress(lastStaminaRecover: Date): number {
  const now = Date.now();
  const lastRecover = lastStaminaRecover.getTime();
  const intervalMs = STAMINA_RECOVER_INTERVAL_MINUTES * 60 * 1000;
  const timeDiff = now - lastRecover;
  return Math.min(1, timeDiff / intervalMs);
}

export const staminaConstants = {
  recoverIntervalMinutes: STAMINA_RECOVER_INTERVAL_MINUTES,
  recoverIntervalMs: STAMINA_RECOVER_INTERVAL_MINUTES * 60 * 1000,
  recoverAmount: STAMINA_RECOVER_AMOUNT,
};
