// 游戏日跳过服务 - 处理游戏日推进、体力恢复、市场刷新重置、资产历史记录
import { prisma } from "@/lib/db";
import { generateDailyStories } from "@/lib/market-service";

// 游戏日信息
export interface GameDayInfo {
  success: boolean;
  reason?: string;
  gameDay?: number;
  stamina?: number;
  maxStamina?: number;
  health?: number;
  balance?: number;
  survivalDays?: number;
  marketRefreshCount?: number;
  marketRefreshDate?: Date | null;
  lastStaminaRecover?: Date;
}

// 跳过当前游戏日到第二天
// 效果：gameDay+1，stamina 恢复满，marketRefreshCount 重置，生成新一天市场故事，记录 AssetHistory
export async function skipDay(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        inventory: {
          include: { item: true },
        },
      },
    });

    if (!user) {
      return { success: false, reason: "USER_NOT_FOUND" };
    }

    if (user.status !== "ALIVE") {
      return { success: false, reason: "USER_NOT_ALIVE" };
    }

    const currentGameDay = user.gameDay;
    const newGameDay = currentGameDay + 1;
    const now = new Date();

    // 计算库存价值（按当前市价）
    const inventoryValue = user.inventory.reduce(
      (sum, inv) => sum + inv.quantity * inv.item.currentPrice,
      0
    );
    const totalAssets = user.balance + inventoryValue;

    // 查询上一条资产记录，计算当日收支
    const lastHistory = await prisma.assetHistory.findFirst({
      where: { userId },
      orderBy: { gameDay: "desc" },
    });

    const sinceDate = lastHistory?.recordedAt ?? new Date(0);
    const [transactions, workRecords] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, timestamp: { gte: sinceDate } },
      }),
      prisma.workRecord.findMany({
        where: { userId, completedAt: { gte: sinceDate } },
      }),
    ]);

    // 当日收益 = 卖出收入 + 劳动收益
    const earned =
      transactions
        .filter((t) => t.type === "SELL")
        .reduce((sum, t) => sum + t.totalAmount, 0) +
      workRecords.reduce((sum, w) => sum + w.finalEarnings, 0);

    // 当日支出 = 买入花费
    const spent = transactions
      .filter((t) => t.type === "BUY")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // 记录当前日结束时的资产快照（upsert 防止重复）
    await prisma.assetHistory.upsert({
      where: { userId_gameDay: { userId, gameDay: currentGameDay } },
      update: {
        balance: user.balance,
        inventoryValue,
        totalAssets,
        earned,
        spent,
      },
      create: {
        userId,
        gameDay: currentGameDay,
        balance: user.balance,
        inventoryValue,
        totalAssets,
        earned,
        spent,
      },
    });

    // 推进到新的一天：体力回满、刷新计数重置
    await prisma.user.update({
      where: { id: userId },
      data: {
        gameDay: newGameDay,
        stamina: user.maxStamina,
        lastStaminaRecover: now,
        marketRefreshCount: 0,
        marketRefreshDate: null,
      },
    });

    // 生成新一天的市场故事
    const stories = await generateDailyStories(newGameDay);

    return {
      success: true,
      previousGameDay: currentGameDay,
      newGameDay,
      stamina: user.maxStamina,
      maxStamina: user.maxStamina,
      marketRefreshCount: 0,
      storiesGenerated: stories.length,
      assetSnapshot: {
        gameDay: currentGameDay,
        balance: user.balance,
        inventoryValue,
        totalAssets,
        earned,
        spent,
      },
    };
  } catch (error) {
    console.error("[SKIP_DAY_ERROR]", error);
    return { success: false, reason: "SERVER_ERROR" };
  }
}

// 获取当前游戏日信息
export async function getGameDayInfo(userId: string): Promise<GameDayInfo> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        gameDay: true,
        stamina: true,
        maxStamina: true,
        health: true,
        balance: true,
        marketRefreshCount: true,
        marketRefreshDate: true,
        survivalDays: true,
        lastStaminaRecover: true,
      },
    });

    if (!user) {
      return { success: false, reason: "USER_NOT_FOUND" };
    }

    // 跨天重置检查（前端展示用）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let effectiveRefreshCount = user.marketRefreshCount;

    if (user.marketRefreshDate) {
      const refreshDay = new Date(user.marketRefreshDate);
      refreshDay.setHours(0, 0, 0, 0);
      if (refreshDay.getTime() !== today.getTime()) {
        effectiveRefreshCount = 0;
      }
    }

    return {
      success: true,
      gameDay: user.gameDay,
      stamina: user.stamina,
      maxStamina: user.maxStamina,
      health: user.health,
      balance: user.balance,
      survivalDays: user.survivalDays,
      marketRefreshCount: effectiveRefreshCount,
      marketRefreshDate: user.marketRefreshDate,
      lastStaminaRecover: user.lastStaminaRecover,
    };
  } catch (error) {
    console.error("[GET_GAMEDAY_INFO_ERROR]", error);
    return { success: false, reason: "SERVER_ERROR" };
  }
}
