import { clamp, randomInRange } from "@/lib/utils";
import type { PersonalityType } from "@/types";
import { PERSONALITY_CONFIG, WORK_TYPE_CONFIG } from "@/types";

export function calculateWorkEarnings(
  workType: string,
  personality: PersonalityType,
  skillBonus: number = 1.0
): {
  basePay: number;
  personalityBonus: number;
  skillBonus: number;
  finalEarnings: number;
  staminaCost: number;
} {
  const config = WORK_TYPE_CONFIG[workType as keyof typeof WORK_TYPE_CONFIG];
  const personalityConfig = PERSONALITY_CONFIG[personality];

  let workMultiplier = personalityConfig.workMultiplier;

  if (personalityConfig.isRandom) {
    const randomFactor = 1 + randomInRange(-personalityConfig.randomRange, personalityConfig.randomRange);
    workMultiplier *= randomFactor;
  }

  const finalEarnings = config.basePay * workMultiplier * skillBonus;

  const staminaCost = Math.round(
    config.staminaCost * personalityConfig.staminaMultiplier
  );

  return {
    basePay: config.basePay,
    personalityBonus: workMultiplier,
    skillBonus,
    finalEarnings: Math.round(finalEarnings * 100) / 100,
    staminaCost,
  };
}

export function calculatePrice(
  basePrice: number,
  minPrice: number,
  maxPrice: number,
  randomFactor: number = 0.1,
  eventMultiplier: number = 1.0,
  supplyDemandRatio: number = 1.0
): number {
  const randomChange = randomInRange(-randomFactor, randomFactor);
  const supplyDemandEffect = (supplyDemandRatio - 1) * 0.5;

  const totalChange = randomChange + supplyDemandEffect;
  const newPrice = basePrice * (1 + totalChange) * eventMultiplier;

  return clamp(newPrice, minPrice, maxPrice);
}

export function getPriceHint(
  currentPrice: number,
  basePrice: number,
  hasPriceInsight: boolean = false
): {
  hint: string;
  trend: "up" | "down" | "neutral";
  ratio: number;
} {
  const ratio = currentPrice / basePrice;

  let hint: string;
  let trend: "up" | "down" | "neutral";

  if (ratio < 0.7) {
    hint = "传闻该商品即将被大量收购";
    trend = "up";
  } else if (ratio > 1.3) {
    hint = "市场上该商品供应过剩，价格承压";
    trend = "down";
  } else if (ratio < 0.9) {
    hint = "市场情绪偏乐观";
    trend = "up";
  } else if (ratio > 1.1) {
    hint = "市场情绪偏悲观";
    trend = "down";
  } else {
    hint = "市场情绪中性";
    trend = "neutral";
  }

  if (hasPriceInsight) {
    const percentage = ((ratio - 1) * 100).toFixed(1);
    hint = `价格偏离基准 ${percentage >= "0" ? "+" : ""}${percentage}%`;
  }

  return { hint, trend, ratio };
}

export function calculateDailyConsumption(
  personality: PersonalityType
): {
  waterNeeded: number;
  foodNeeded: number;
  waterPenalty: number;
  foodPenalty: number;
} {
  const personalityConfig = PERSONALITY_CONFIG[personality];
  const multiplier = personalityConfig.consumptionMultiplier;

  return {
    waterNeeded: Math.max(1, Math.round(2 * multiplier)),
    foodNeeded: Math.max(1, Math.round(2 * multiplier)),
    waterPenalty: 15,
    foodPenalty: 20,
  };
}

export function calculateStaminaRecovery(
  lastRecover: Date,
  maxStamina: number,
  currentStamina: number,
  recoveryAmount: number = 10,
  intervalMinutes: number = 10
): {
  newStamina: number;
  recovered: number;
  nextRecoverAt: Date;
} {
  const now = new Date();
  const elapsedMs = now.getTime() - lastRecover.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);

  const intervals = Math.floor(elapsedMinutes / intervalMinutes);

  if (intervals <= 0) {
    return {
      newStamina: currentStamina,
      recovered: 0,
      nextRecoverAt: new Date(
        lastRecover.getTime() + intervalMinutes * 60 * 1000
      ),
    };
  }

  const recovered = Math.min(
    intervals * recoveryAmount,
    maxStamina - currentStamina
  );

  const newStamina = Math.min(currentStamina + recovered, maxStamina);

  const remainingMinutes = elapsedMinutes - intervals * intervalMinutes;
  const nextRecoverAt = new Date(
    now.getTime() + (intervalMinutes - remainingMinutes) * 60 * 1000
  );

  return {
    newStamina,
    recovered,
    nextRecoverAt,
  };
}

export function calculateTradeProfit(
  buyPrice: number,
  sellPrice: number,
  quantity: number,
  personality: PersonalityType
): {
  cost: number;
  revenue: number;
  profit: number;
  profitMargin: number;
} {
  const personalityConfig = PERSONALITY_CONFIG[personality];
  let profitMultiplier = personalityConfig.tradeProfitMultiplier;

  if (personalityConfig.isRandom) {
    const randomFactor = 1 + randomInRange(-personalityConfig.randomRange, personalityConfig.randomRange);
    profitMultiplier *= randomFactor;
  }

  const cost = buyPrice * quantity;
  const baseRevenue = sellPrice * quantity;
  const profit = (baseRevenue - cost) * profitMultiplier;
  const revenue = cost + profit;
  const profitMargin = cost > 0 ? (profit / cost) * 100 : 0;

  return {
    cost: Math.round(cost * 100) / 100,
    revenue: Math.round(revenue * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
  };
}

export interface FifoInventoryItem {
  id: string;
  quantity: number;
  buyPrice: number;
  purchaseDate: Date;
}

export interface FifoSellResult {
  matchedLots: {
    inventoryItemId: string;
    quantity: number;
    buyPrice: number;
    profit: number;
  }[];
  totalProfit: number;
  totalCost: number;
  totalRevenue: number;
  remainingQuantity: number;
}

export function processFifoSell(
  inventory: FifoInventoryItem[],
  sellQuantity: number,
  sellPrice: number,
  personality: PersonalityType
): FifoSellResult {
  const sortedInventory = [...inventory].sort(
    (a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime()
  );

  const matchedLots: FifoSellResult["matchedLots"] = [];
  let remainingQuantity = sellQuantity;
  let totalCost = 0;
  let totalRevenue = 0;
  let totalProfit = 0;

  for (const item of sortedInventory) {
    if (remainingQuantity <= 0) break;

    const sellFromLot = Math.min(item.quantity, remainingQuantity);
    const { cost, revenue, profit } = calculateTradeProfit(
      item.buyPrice,
      sellPrice,
      sellFromLot,
      personality
    );

    matchedLots.push({
      inventoryItemId: item.id,
      quantity: sellFromLot,
      buyPrice: item.buyPrice,
      profit,
    });

    totalCost += cost;
    totalRevenue += revenue;
    totalProfit += profit;
    remainingQuantity -= sellFromLot;
  }

  return {
    matchedLots,
    totalCost: Math.round(totalCost * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    remainingQuantity,
  };
}
