import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/economy";
import { redisService } from "@/lib/redis";

const PRICE_UPDATE_LOCK_KEY = "price:update:lock";
const PRICE_CACHE_KEY = "market:prices";
const PRICE_CACHE_TTL = 300;

export async function updateAllPrices(): Promise<{
  updated: number;
  items: Array<{
    id: string;
    name: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
  }>;
}> {
  const lockAcquired = await redisService.acquireLock(PRICE_UPDATE_LOCK_KEY, 60);

  if (!lockAcquired && redisService.isAvailable()) {
    return { updated: 0, items: [] };
  }

  try {
    const items = await prisma.item.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        basePrice: true,
        minPrice: true,
        maxPrice: true,
        currentPrice: true,
        buyVolume24h: true,
        sellVolume24h: true,
      },
    });

    const results: Array<{
      id: string;
      name: string;
      oldPrice: number;
      newPrice: number;
      changePercent: number;
    }> = [];

    const activeEvents = await prisma.systemEvent.findMany({
      where: {
        isActive: true,
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
    });

    for (const item of items) {
      const supplyDemandRatio =
        item.sellVolume24h > 0
          ? item.buyVolume24h / item.sellVolume24h
          : 1;

      let eventMultiplier = 1.0;
      for (const event of activeEvents) {
        if (event.eventType === "PRICE_SURGE") {
          if (
            event.scope === "GLOBAL" ||
            (event.scope === "SPECIFIC_ITEMS" &&
              event.targetItemIds.includes(item.id))
          ) {
            eventMultiplier *= event.effectValue;
          }
        }
      }

      const newPrice = calculatePrice(
        item.basePrice,
        item.minPrice,
        item.maxPrice,
        0.1,
        eventMultiplier,
        supplyDemandRatio
      );

      const roundedPrice = Math.round(newPrice * 100) / 100;

      if (Math.abs(roundedPrice - item.currentPrice) > 0.01) {
        await prisma.$transaction([
          prisma.item.update({
            where: { id: item.id },
            data: { currentPrice: roundedPrice },
          }),
          prisma.priceRecord.create({
            data: {
              itemId: item.id,
              price: roundedPrice,
            },
          }),
        ]);

        results.push({
          id: item.id,
          name: item.name,
          oldPrice: item.currentPrice,
          newPrice: roundedPrice,
          changePercent: ((roundedPrice - item.currentPrice) / item.currentPrice) * 100,
        });
      }
    }

    await redisService.del(PRICE_CACHE_KEY);

    return {
      updated: results.length,
      items: results,
    };
  } finally {
    if (redisService.isAvailable()) {
      await redisService.releaseLock(PRICE_UPDATE_LOCK_KEY);
    }
  }
}

export async function getPrices() {
  const cached = await redisService.get(PRICE_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  await redisService.set(PRICE_CACHE_KEY, items, PRICE_CACHE_TTL);

  return items;
}

export async function getPriceHistory(itemId: string, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const history = await prisma.priceRecord.findMany({
    where: {
      itemId,
      timestamp: { gte: since },
    },
    orderBy: { timestamp: "asc" },
  });

  return history;
}
