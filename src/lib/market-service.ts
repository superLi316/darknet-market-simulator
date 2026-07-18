// 黑市刷新与市场故事服务
// 处理每日市场商品列表、手动刷新、市场故事生成与付费解锁
import { prisma } from "@/lib/db";
import { MARKET_REFRESH_CONFIG } from "@/types";
import { randomInRange } from "@/lib/utils";

// 付费市场提示解锁费用
export const PREMIUM_STORY_COST = 50;

// 涨价故事模板（{item} 会被替换为商品名）
const STORY_TEMPLATES_UP = [
  "天气预报明天会下大雨，{item}的需求可能增加",
  "传闻{item}的供应链出了问题，价格或上涨",
  "黑市大佬正在暗中囤积{item}，价格看涨",
  "{item}的产地发生动荡，供应吃紧",
  "海关收紧了对{item}的查验，货源紧张",
  "某地下集团正在高价收购{item}",
];

// 跌价故事模板
const STORY_TEMPLATES_DOWN = [
  "{item}的替代品出现了，价格或下跌",
  "海关查获一批{item}，市场供应大增",
  "{item}的保质期临近，商家急于出手",
  "传闻{item}的市场需求正在萎缩",
  "新货源涌入市场，{item}价格承压",
  "官方打击{item}交易，持有者恐慌抛售",
];

// 简单字符串哈希（用于生成确定性种子）
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash; // 转为 32 位整数
  }
  return Math.abs(hash);
}

// 带种子的伪随机数生成器（保证同一天 + 同一刷新次数结果一致）
function seededRandom(seed: number): () => number {
  let state = seed % 233280;
  if (state <= 0) state = 1;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

// 加权随机选择（rarity 越高越稀有 → 权重越低）
// rarity 1 → weight 5, rarity 5 → weight 1
function selectWeightedRandom<T extends { rarity: number }>(
  items: T[],
  count: number,
  rng: () => number = Math.random
): T[] {
  if (items.length <= count) return [...items];

  const remaining = [...items];
  const selected: T[] = [];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const weights = remaining.map((item) => 6 - item.rarity);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let r = rng() * totalWeight;

    for (let j = 0; j < remaining.length; j++) {
      r -= weights[j];
      if (r <= 0) {
        selected.push(remaining[j]);
        remaining.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

// 判断是否跨天（用于重置刷新计数）
function isCrossDay(date: Date | null): boolean {
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(date);
  last.setHours(0, 0, 0, 0);
  return last.getTime() !== today.getTime();
}

// 内部：生成市场商品列表（基于种子，确保同日同刷新次数结果一致）
async function generateMarketItems(
  userId: string,
  gameDay: number,
  refreshCount: number
) {
  const allItems = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // 默认商品始终出现
  const defaultItems = allItems.filter((item) => item.isDefault);
  const nonDefaultItems = allItems.filter((item) => !item.isDefault);

  // 用种子保证同日同刷新次数返回相同结果
  const seed = hashString(userId) + gameDay * 10000 + refreshCount * 97;
  const rng = seededRandom(seed);

  // 非默认商品按 rarity 权重随机选取，填满剩余位置
  const remainingSlots = Math.max(
    0,
    MARKET_REFRESH_CONFIG.DAILY_ITEM_COUNT - defaultItems.length
  );
  const selectedNonDefault = selectWeightedRandom(nonDefaultItems, remainingSlots, rng);

  const marketItems = [...defaultItems, ...selectedNonDefault].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return {
    items: marketItems,
    defaultCount: defaultItems.length,
    randomCount: selectedNonDefault.length,
    gameDay,
    refreshCount,
  };
}

// 获取当日市场商品列表
// 默认商品(isDefault=true)始终出现，非默认商品根据 rarity 权重随机选取
// 总共显示 DAILY_ITEM_COUNT 个
export async function getDailyMarketItems(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        gameDay: true,
        marketRefreshCount: true,
        marketRefreshDate: true,
      },
    });

    if (!user) {
      return { success: false, reason: "USER_NOT_FOUND", items: [] };
    }

    // 跨天重置刷新计数
    const effectiveRefreshCount = isCrossDay(user.marketRefreshDate)
      ? 0
      : user.marketRefreshCount;

    const result = await generateMarketItems(
      userId,
      user.gameDay,
      effectiveRefreshCount
    );

    return {
      success: true,
      ...result,
      marketRefreshCount: effectiveRefreshCount,
    };
  } catch (error) {
    console.error("[GET_DAILY_MARKET_ITEMS_ERROR]", error);
    return { success: false, reason: "SERVER_ERROR", items: [] };
  }
}

// 手动刷新市场
// 费用 = BASE_COST * (COST_MULTIPLIER ^ marketRefreshCount)
// 同一天刷新累加计数，跨天重置
export async function refreshMarket(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        gameDay: true,
        marketRefreshCount: true,
        marketRefreshDate: true,
      },
    });

    if (!user) {
      return { success: false, reason: "USER_NOT_FOUND" };
    }

    const now = new Date();

    // 跨天重置
    const currentRefreshCount = isCrossDay(user.marketRefreshDate)
      ? 0
      : user.marketRefreshCount;

    // 检查刷新上限
    if (currentRefreshCount >= MARKET_REFRESH_CONFIG.MAX_DAILY_REFRESH) {
      return {
        success: false,
        reason: "MAX_REFRESH_REACHED",
        marketRefreshCount: currentRefreshCount,
        maxDailyRefresh: MARKET_REFRESH_CONFIG.MAX_DAILY_REFRESH,
      };
    }

    // 计算费用 = BASE_COST * (COST_MULTIPLIER ^ currentRefreshCount)
    const cost =
      Math.round(
        MARKET_REFRESH_CONFIG.BASE_COST *
          Math.pow(MARKET_REFRESH_CONFIG.COST_MULTIPLIER, currentRefreshCount) *
          100
      ) / 100;

    if (user.balance < cost) {
      return {
        success: false,
        reason: "INSUFFICIENT_BALANCE",
        cost,
        balance: user.balance,
      };
    }

    // 扣除费用，更新刷新计数
    const newRefreshCount = currentRefreshCount + 1;
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: cost },
        totalSpent: { increment: cost },
        marketRefreshCount: newRefreshCount,
        marketRefreshDate: now,
      },
    });

    // 生成新的商品池（刷新次数 +1 → 种子变化 → 新商品集）
    const marketResult = await generateMarketItems(
      userId,
      user.gameDay,
      newRefreshCount
    );

    // 预计算下次刷新费用
    const nextCost =
      Math.round(
        MARKET_REFRESH_CONFIG.BASE_COST *
          Math.pow(MARKET_REFRESH_CONFIG.COST_MULTIPLIER, newRefreshCount) *
          100
      ) / 100;

    return {
      success: true,
      ...marketResult,
      cost,
      marketRefreshCount: newRefreshCount,
      remainingBalance: user.balance - cost,
      nextRefreshCost: nextCost,
      canRefreshAgain:
        newRefreshCount < MARKET_REFRESH_CONFIG.MAX_DAILY_REFRESH,
    };
  } catch (error) {
    console.error("[REFRESH_MARKET_ERROR]", error);
    return { success: false, reason: "SERVER_ERROR" };
  }
}

// 为指定游戏日生成市场故事
// 故事暗示某商品价格会涨/跌，关联 itemId，hintType 标明方向，priceImpact 标明影响系数
export async function generateDailyStories(gameDay: number) {
  try {
    // 已生成则直接返回（幂等）
    const existing = await prisma.marketStory.count({ where: { gameDay } });
    if (existing > 0) {
      return await prisma.marketStory.findMany({
        where: { gameDay },
        include: { item: true },
        orderBy: [{ isPremium: "asc" }, { createdAt: "asc" }],
      });
    }

    const items = await prisma.item.findMany({
      where: { isActive: true },
    });

    if (items.length === 0) {
      return [];
    }

    const stories: Array<{
      storyText: string;
      hintType: string;
      itemId: string;
      gameDay: number;
      isPremium: boolean;
      priceImpact: number;
    }> = [];

    const usedItemIds = new Set<string>();

    // 生成 3 条免费故事
    for (let i = 0; i < 3; i++) {
      const availableItems = items.filter((it) => !usedItemIds.has(it.id));
      if (availableItems.length === 0) break;

      const item = availableItems[Math.floor(Math.random() * availableItems.length)];
      usedItemIds.add(item.id);

      const isUp = Math.random() < 0.5;
      const templates = isUp ? STORY_TEMPLATES_UP : STORY_TEMPLATES_DOWN;
      const template = templates[Math.floor(Math.random() * templates.length)];
      const storyText = template.replace("{item}", item.name);
      const priceImpact = isUp
        ? Math.round(randomInRange(1.1, 1.5) * 100) / 100
        : Math.round(randomInRange(0.5, 0.9) * 100) / 100;

      stories.push({
        storyText,
        hintType: isUp ? "PRICE_UP" : "PRICE_DOWN",
        itemId: item.id,
        gameDay,
        isPremium: false,
        priceImpact,
      });
    }

    // 生成 2 条付费故事（影响系数更大）
    for (let i = 0; i < 2; i++) {
      const availableItems = items.filter((it) => !usedItemIds.has(it.id));
      if (availableItems.length === 0) break;

      const item = availableItems[Math.floor(Math.random() * availableItems.length)];
      usedItemIds.add(item.id);

      const isUp = Math.random() < 0.5;
      const templates = isUp ? STORY_TEMPLATES_UP : STORY_TEMPLATES_DOWN;
      const template = templates[Math.floor(Math.random() * templates.length)];
      const storyText = template.replace("{item}", item.name);
      const priceImpact = isUp
        ? Math.round(randomInRange(1.2, 1.6) * 100) / 100
        : Math.round(randomInRange(0.4, 0.8) * 100) / 100;

      stories.push({
        storyText,
        hintType: isUp ? "PRICE_UP" : "PRICE_DOWN",
        itemId: item.id,
        gameDay,
        isPremium: true,
        priceImpact,
      });
    }

    // 批量写入
    await prisma.marketStory.createMany({ data: stories });

    return await prisma.marketStory.findMany({
      where: { gameDay },
      include: { item: true },
      orderBy: [{ isPremium: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    console.error("[GENERATE_DAILY_STORIES_ERROR]", error);
    return [];
  }
}

// 获取当日市场故事提示
// 免费故事显示完整内容，付费故事仅显示概要（需购买后查看详情）
export async function getMarketStories(gameDay: number) {
  try {
    // 确保故事已生成
    await generateDailyStories(gameDay);

    const stories = await prisma.marketStory.findMany({
      where: { gameDay },
      include: { item: true },
      orderBy: [{ isPremium: "asc" }, { createdAt: "asc" }],
    });

    // 免费故事：返回完整内容
    const freeStories = stories
      .filter((s) => !s.isPremium)
      .map((s) => ({
        id: s.id,
        storyText: s.storyText,
        hintType: s.hintType,
        itemId: s.itemId,
        itemName: s.item?.name,
        gameDay: s.gameDay,
        isPremium: false,
        priceImpact: s.priceImpact,
      }));

    // 付费故事：隐藏核心情报，仅显示概要
    const premiumStories = stories
      .filter((s) => s.isPremium)
      .map((s) => ({
        id: s.id,
        storyText: null, // 购买后解锁
        hintType: null,
        itemId: null,
        itemName: null,
        gameDay: s.gameDay,
        isPremium: true,
        priceImpact: null,
        cost: PREMIUM_STORY_COST,
        teaser: "一条来自线人的加密情报，可能涉及某商品的价格剧烈变动。",
      }));

    return {
      success: true,
      gameDay,
      freeStories,
      premiumStories,
    };
  } catch (error) {
    console.error("[GET_MARKET_STORIES_ERROR]", error);
    return {
      success: false,
      reason: "SERVER_ERROR",
      freeStories: [],
      premiumStories: [],
    };
  }
}

// 花费货币购买付费市场提示
// 通过通知记录追踪已购买的提示，避免重复扣费
export async function buyPremiumStory(userId: string, storyId: string) {
  try {
    const story = await prisma.marketStory.findUnique({
      where: { id: storyId },
      include: { item: true },
    });

    if (!story) {
      return { success: false, reason: "STORY_NOT_FOUND" };
    }

    if (!story.isPremium) {
      return { success: false, reason: "STORY_NOT_PREMIUM" };
    }

    // 检查是否已购买（通过通知记录中的 storyId 判断）
    const existingPurchase = await prisma.notification.findFirst({
      where: {
        userId,
        type: "SYSTEM",
        metadata: { contains: storyId },
      },
    });

    if (existingPurchase) {
      // 已购买，直接返回完整内容
      return {
        success: true,
        reason: "ALREADY_PURCHASED",
        cost: 0,
        story: {
          id: story.id,
          storyText: story.storyText,
          hintType: story.hintType,
          itemId: story.itemId,
          itemName: story.item?.name,
          priceImpact: story.priceImpact,
          gameDay: story.gameDay,
        },
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      return { success: false, reason: "USER_NOT_FOUND" };
    }

    if (user.balance < PREMIUM_STORY_COST) {
      return {
        success: false,
        reason: "INSUFFICIENT_BALANCE",
        cost: PREMIUM_STORY_COST,
        balance: user.balance,
      };
    }

    // 扣除货币并记录购买（通过通知持久化，防重复购买）
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: PREMIUM_STORY_COST },
          totalSpent: { increment: PREMIUM_STORY_COST },
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "解锁市场情报",
          content: `你花费 ${PREMIUM_STORY_COST} 货币解锁了一条市场情报：${story.storyText}`,
          metadata: JSON.stringify({
            type: "PREMIUM_STORY_PURCHASE",
            storyId,
            gameDay: story.gameDay,
          }),
        },
      }),
    ]);

    return {
      success: true,
      cost: PREMIUM_STORY_COST,
      remainingBalance: user.balance - PREMIUM_STORY_COST,
      story: {
        id: story.id,
        storyText: story.storyText,
        hintType: story.hintType,
        itemId: story.itemId,
        itemName: story.item?.name,
        priceImpact: story.priceImpact,
        gameDay: story.gameDay,
      },
    };
  } catch (error) {
    console.error("[BUY_PREMIUM_STORY_ERROR]", error);
    return { success: false, reason: "SERVER_ERROR" };
  }
}
