import { prisma } from "@/lib/db";
import type { AchievementCategory, TitleBuffType } from "@/types";

// ============================================
// 成就与头衔定义（硬编码）
// ============================================

// 成就条件字段类型
type ConditionField =
  | "workCount"
  | "tradeCount"
  | "survivalDays"
  | "totalEarned"
  | "skillCount"
  | "totalTrophies";

// 头衔定义
interface TitleDefinition {
  code: string;
  name: string;
  description: string;
  buffType: TitleBuffType;
  buffValue: number; // 百分比 buff 用小数（0.05 = 5%），固定值 buff 用整数（20 = +20）
  rarity: number;
}

// 成就定义
interface AchievementDefinition {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  condition: {
    field: ConditionField;
    operator: ">=";
    value: number;
  };
  title: TitleDefinition;
}

// 头衔定义列表
const TITLE_DEFINITIONS: TitleDefinition[] = [
  // 劳动类头衔
  {
    code: "TITLE_WORK_10",
    name: "初出茅庐",
    description: "完成 10 次劳动后获得",
    buffType: "EARNINGS_BOOST",
    buffValue: 0.05,
    rarity: 1,
  },
  {
    code: "TITLE_WORK_50",
    name: "劳模",
    description: "完成 50 次劳动后获得",
    buffType: "EARNINGS_BOOST",
    buffValue: 0.1,
    rarity: 2,
  },
  {
    code: "TITLE_WORK_200",
    name: "工作狂",
    description: "完成 200 次劳动后获得",
    buffType: "EARNINGS_BOOST",
    buffValue: 0.15,
    rarity: 3,
  },
  // 交易类头衔
  {
    code: "TITLE_TRADE_10",
    name: "小贩",
    description: "完成 10 次交易后获得",
    buffType: "TRADE_BOOST",
    buffValue: 0.05,
    rarity: 1,
  },
  {
    code: "TITLE_TRADE_50",
    name: "商人",
    description: "完成 50 次交易后获得",
    buffType: "TRADE_BOOST",
    buffValue: 0.1,
    rarity: 2,
  },
  {
    code: "TITLE_TRADE_200",
    name: "黑市大亨",
    description: "完成 200 次交易后获得",
    buffType: "TRADE_BOOST",
    buffValue: 0.2,
    rarity: 3,
  },
  // 生存类头衔
  {
    code: "TITLE_SURVIVE_7",
    name: "幸存者",
    description: "存活 7 天后获得",
    buffType: "HEALTH_MAX",
    buffValue: 20,
    rarity: 2,
  },
  {
    code: "TITLE_SURVIVE_30",
    name: "老油条",
    description: "存活 30 天后获得",
    buffType: "HEALTH_MAX",
    buffValue: 50,
    rarity: 3,
  },
  // 财富类头衔
  {
    code: "TITLE_EARN_1000",
    name: "万元户",
    description: "累计赚取 1000 货币后获得",
    buffType: "STAMINA_MAX",
    buffValue: 20,
    rarity: 2,
  },
  {
    code: "TITLE_EARN_5000",
    name: "财阀",
    description: "累计赚取 5000 货币后获得",
    buffType: "CRIT_BOOST",
    buffValue: 0.1,
    rarity: 4,
  },
  // 技能类头衔
  {
    code: "TITLE_SKILL_5",
    name: "多面手",
    description: "拥有 5 个技能后获得",
    buffType: "EARNINGS_BOOST",
    buffValue: 0.08,
    rarity: 2,
  },
  // 奖杯类头衔
  {
    code: "TITLE_TROPHY_5",
    name: "收藏家",
    description: "拥有 5 个奖杯后获得",
    buffType: "TRADE_BOOST",
    buffValue: 0.08,
    rarity: 2,
  },
];

// 成就定义列表（与头衔一一对应）
const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    code: "WORK_10",
    name: "初出茅庐",
    description: "完成 10 次劳动",
    category: "WORK",
    condition: { field: "workCount", operator: ">=", value: 10 },
    title: TITLE_DEFINITIONS[0],
  },
  {
    code: "WORK_50",
    name: "劳模",
    description: "完成 50 次劳动",
    category: "WORK",
    condition: { field: "workCount", operator: ">=", value: 50 },
    title: TITLE_DEFINITIONS[1],
  },
  {
    code: "WORK_200",
    name: "工作狂",
    description: "完成 200 次劳动",
    category: "WORK",
    condition: { field: "workCount", operator: ">=", value: 200 },
    title: TITLE_DEFINITIONS[2],
  },
  {
    code: "TRADE_10",
    name: "小贩",
    description: "完成 10 次交易",
    category: "TRADE",
    condition: { field: "tradeCount", operator: ">=", value: 10 },
    title: TITLE_DEFINITIONS[3],
  },
  {
    code: "TRADE_50",
    name: "商人",
    description: "完成 50 次交易",
    category: "TRADE",
    condition: { field: "tradeCount", operator: ">=", value: 50 },
    title: TITLE_DEFINITIONS[4],
  },
  {
    code: "TRADE_200",
    name: "黑市大亨",
    description: "完成 200 次交易",
    category: "TRADE",
    condition: { field: "tradeCount", operator: ">=", value: 200 },
    title: TITLE_DEFINITIONS[5],
  },
  {
    code: "SURVIVE_7",
    name: "幸存者",
    description: "存活 7 天",
    category: "SURVIVAL",
    condition: { field: "survivalDays", operator: ">=", value: 7 },
    title: TITLE_DEFINITIONS[6],
  },
  {
    code: "SURVIVE_30",
    name: "老油条",
    description: "存活 30 天",
    category: "SURVIVAL",
    condition: { field: "survivalDays", operator: ">=", value: 30 },
    title: TITLE_DEFINITIONS[7],
  },
  {
    code: "EARN_1000",
    name: "万元户",
    description: "累计赚取 1000 货币",
    category: "SPECIAL",
    condition: { field: "totalEarned", operator: ">=", value: 1000 },
    title: TITLE_DEFINITIONS[8],
  },
  {
    code: "EARN_5000",
    name: "财阀",
    description: "累计赚取 5000 货币",
    category: "SPECIAL",
    condition: { field: "totalEarned", operator: ">=", value: 5000 },
    title: TITLE_DEFINITIONS[9],
  },
  {
    code: "SKILL_5",
    name: "多面手",
    description: "拥有 5 个技能",
    category: "SKILL",
    condition: { field: "skillCount", operator: ">=", value: 5 },
    title: TITLE_DEFINITIONS[10],
  },
  {
    code: "TROPHY_5",
    name: "收藏家",
    description: "拥有 5 个奖杯",
    category: "TROPHY",
    condition: { field: "totalTrophies", operator: ">=", value: 5 },
    title: TITLE_DEFINITIONS[11],
  },
];

// 模块级初始化标志，避免重复同步
let initialized = false;

/**
 * 将硬编码的头衔与成就定义同步到数据库
 * 使用 upsert 保证幂等，可安全重复调用
 */
async function ensureAchievementsInitialized(): Promise<void> {
  // 先同步头衔
  for (const titleDef of TITLE_DEFINITIONS) {
    const existing = await prisma.title.findUnique({
      where: { code: titleDef.code },
    });

    if (existing) {
      await prisma.title.update({
        where: { id: existing.id },
        data: {
          name: titleDef.name,
          description: titleDef.description,
          buffType: titleDef.buffType,
          buffValue: titleDef.buffValue,
          rarity: titleDef.rarity,
        },
      });
    } else {
      await prisma.title.create({
        data: {
          code: titleDef.code,
          name: titleDef.name,
          description: titleDef.description,
          buffType: titleDef.buffType,
          buffValue: titleDef.buffValue,
          rarity: titleDef.rarity,
        },
      });
    }
  }

  // 再同步成就，关联对应头衔
  for (const achDef of ACHIEVEMENT_DEFINITIONS) {
    const title = await prisma.title.findUnique({
      where: { code: achDef.title.code },
    });

    if (!title) {
      continue; // 头衔不存在则跳过（理论上不会发生）
    }

    const existing = await prisma.achievement.findUnique({
      where: { code: achDef.code },
    });

    const conditionJson = JSON.stringify(achDef.condition);

    if (existing) {
      await prisma.achievement.update({
        where: { id: existing.id },
        data: {
          name: achDef.name,
          description: achDef.description,
          category: achDef.category,
          condition: conditionJson,
          titleId: title.id,
        },
      });
    } else {
      await prisma.achievement.create({
        data: {
          code: achDef.code,
          name: achDef.name,
          description: achDef.description,
          category: achDef.category,
          condition: conditionJson,
          titleId: title.id,
        },
      });
    }
  }
}

/**
 * 确保初始化已完成（带标志位避免重复调用）
 */
async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  try {
    await ensureAchievementsInitialized();
    initialized = true;
  } catch (error) {
    console.error("[ACHIEVEMENT_INIT_ERROR]", error);
    // 不设置标志位，下次调用会重试
  }
}

/**
 * 检查条件是否达成
 */
function isConditionMet(
  condition: AchievementDefinition["condition"],
  stats: Record<ConditionField, number>
): boolean {
  const value = stats[condition.field];
  if (condition.operator === ">=") {
    return value >= condition.value;
  }
  return false;
}

/**
 * 收集用户统计数据，用于成就判定
 */
async function collectUserStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      workCount: true,
      tradeCount: true,
      survivalDays: true,
      totalEarned: true,
      smallTrophies: true,
      largeTrophies: true,
    },
  });

  if (!user) {
    return null;
  }

  // 查询用户拥有的技能数量
  const skillCount = await prisma.userSkill.count({
    where: { userId },
  });

  return {
    workCount: user.workCount,
    tradeCount: user.tradeCount,
    survivalDays: user.survivalDays,
    totalEarned: user.totalEarned,
    skillCount,
    totalTrophies: user.smallTrophies + user.largeTrophies,
  };
}

// 新达成成就的返回类型
export interface NewlyAchieved {
  achievementId: string;
  achievementCode: string;
  achievementName: string;
  titleId?: string;
  titleName?: string;
  titleBuffType?: TitleBuffType;
  titleBuffValue?: number;
}

/**
 * 检查用户是否达成任何成就
 * 达成则创建 PlayerAchievement 记录，关联头衔则授予 PlayerTitle，并发送通知
 */
export async function checkAchievements(
  userId: string
): Promise<{ newAchievements: NewlyAchieved[] }> {
  await ensureInitialized();

  const stats = await collectUserStats(userId);
  if (!stats) {
    return { newAchievements: [] };
  }

  // 获取用户已完成的成就
  const existingRecords = await prisma.playerAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { code: true } } },
  });
  const existingCodes = new Set(
    existingRecords.map((r) => r.achievement.code)
  );

  // 获取数据库中的成就（含关联头衔）
  const dbAchievements = await prisma.achievement.findMany({
    include: { title: true },
  });

  const newAchievements: NewlyAchieved[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    // 已完成则跳过
    if (existingCodes.has(def.code)) {
      continue;
    }

    // 条件未达成则跳过
    if (!isConditionMet(def.condition, stats)) {
      continue;
    }

    // 查找数据库中的成就记录
    const dbAch = dbAchievements.find((a) => a.code === def.code);
    if (!dbAch) {
      continue;
    }

    // 使用事务保证原子性：创建成就记录 + 授予头衔 + 发送通知
    await prisma.$transaction(async (tx) => {
      // 创建玩家成就记录
      await tx.playerAchievement.create({
        data: {
          userId,
          achievementId: dbAch.id,
          progress: 100,
        },
      });

      // 如果成就关联头衔，授予玩家头衔（已拥有则跳过）
      if (dbAch.titleId && dbAch.title) {
        const existingTitle = await tx.playerTitle.findUnique({
          where: {
            userId_titleId: {
              userId,
              titleId: dbAch.titleId,
            },
          },
        });

        if (!existingTitle) {
          await tx.playerTitle.create({
            data: {
              userId,
              titleId: dbAch.titleId,
              isActive: false,
            },
          });
        }
      }

      // 发送成就通知
      await tx.notification.create({
        data: {
          userId,
          type: "ACHIEVEMENT",
          title: "达成新成就",
          content: dbAch.title
            ? `恭喜达成成就「${def.name}」！获得头衔「${dbAch.title.name}」`
            : `恭喜达成成就「${def.name}」！`,
        },
      });
    });

    newAchievements.push({
      achievementId: dbAch.id,
      achievementCode: def.code,
      achievementName: def.name,
      titleId: dbAch.titleId || undefined,
      titleName: dbAch.title?.name,
      titleBuffType: dbAch.title?.buffType as TitleBuffType | undefined,
      titleBuffValue: dbAch.title?.buffValue,
    });
  }

  return { newAchievements };
}

// 成就列表项类型
export interface AchievementWithStatus {
  id: string;
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  condition: {
    field: ConditionField;
    operator: string;
    value: number;
  };
  isCompleted: boolean;
  completedAt: Date | null;
  progress: number;
  title?: {
    id: string;
    name: string;
    buffType: TitleBuffType;
    buffValue: number;
  };
}

/**
 * 获取所有成就列表及用户完成状态
 */
export async function getAchievements(
  userId: string
): Promise<{ achievements: AchievementWithStatus[] }> {
  await ensureInitialized();

  const dbAchievements = await prisma.achievement.findMany({
    include: {
      title: true,
      playerAchievements: {
        where: { userId },
        select: { completedAt: true, progress: true },
      },
    },
  });

  const achievements: AchievementWithStatus[] = dbAchievements.map((a) => {
    const playerRecord = a.playerAchievements[0];
    let condition: {
      field: ConditionField;
      operator: string;
      value: number;
    };
    try {
      condition = JSON.parse(a.condition);
    } catch {
      condition = { field: "workCount", operator: ">=", value: 0 };
    }

    return {
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      category: a.category as AchievementCategory,
      condition,
      isCompleted: !!playerRecord,
      completedAt: playerRecord?.completedAt || null,
      progress: playerRecord?.progress || 0,
      title: a.title
        ? {
            id: a.title.id,
            name: a.title.name,
            buffType: a.title.buffType as TitleBuffType,
            buffValue: a.title.buffValue,
          }
        : undefined,
    };
  });

  return { achievements };
}

// 玩家头衔列表项类型
export interface PlayerTitleInfo {
  id: string;
  titleId: string;
  code: string;
  name: string;
  description: string;
  buffType: TitleBuffType;
  buffValue: number;
  rarity: number;
  isActive: boolean;
  acquiredAt: Date;
}

/**
 * 获取用户所有头衔
 */
export async function getTitles(
  userId: string
): Promise<{ titles: PlayerTitleInfo[] }> {
  await ensureInitialized();

  const playerTitles = await prisma.playerTitle.findMany({
    where: { userId },
    include: {
      title: true,
    },
    orderBy: { acquiredAt: "asc" },
  });

  const titles: PlayerTitleInfo[] = playerTitles.map((pt) => ({
    id: pt.id,
    titleId: pt.titleId,
    code: pt.title.code,
    name: pt.title.name,
    description: pt.title.description,
    buffType: pt.title.buffType as TitleBuffType,
    buffValue: pt.title.buffValue,
    rarity: pt.title.rarity,
    isActive: pt.isActive,
    acquiredAt: pt.acquiredAt,
  }));

  return { titles };
}

/**
 * 激活一个头衔
 * 同时只能激活一个：将其他头衔设为 isActive=false，目标头衔设为 true
 * 并更新 User.currentTitleId
 */
export async function activateTitle(
  userId: string,
  titleId: string
): Promise<{
  success: boolean;
  message: string;
  title?: PlayerTitleInfo;
}> {
  await ensureInitialized();

  // 检查用户是否拥有该头衔
  const playerTitle = await prisma.playerTitle.findUnique({
    where: {
      userId_titleId: {
        userId,
        titleId,
      },
    },
    include: { title: true },
  });

  if (!playerTitle) {
    return {
      success: false,
      message: "未拥有该头衔",
    };
  }

  // 使用事务更新激活状态
  await prisma.$transaction(async (tx) => {
    // 先将所有头衔设为未激活
    await tx.playerTitle.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    // 再将目标头衔设为激活
    await tx.playerTitle.update({
      where: { id: playerTitle.id },
      data: { isActive: true },
    });

    // 更新用户当前头衔
    await tx.user.update({
      where: { id: userId },
      data: { currentTitleId: titleId },
    });
  });

  return {
    success: true,
    message: "头衔激活成功",
    title: {
      id: playerTitle.id,
      titleId: playerTitle.titleId,
      code: playerTitle.title.code,
      name: playerTitle.title.name,
      description: playerTitle.title.description,
      buffType: playerTitle.title.buffType as TitleBuffType,
      buffValue: playerTitle.title.buffValue,
      rarity: playerTitle.title.rarity,
      isActive: true,
      acquiredAt: playerTitle.acquiredAt,
    },
  };
}

// 头衔 buff 效果类型
export interface TitleBuff {
  titleId: string;
  titleName: string;
  buffType: TitleBuffType;
  buffValue: number;
}

/**
 * 获取当前激活头衔的 buff 效果
 * 如果没有激活的头衔，返回 null
 */
export async function getActiveTitleBuff(
  userId: string
): Promise<TitleBuff | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentTitleId: true },
  });

  if (!user || !user.currentTitleId) {
    return null;
  }

  // 查询激活的头衔
  const playerTitle = await prisma.playerTitle.findUnique({
    where: {
      userId_titleId: {
        userId,
        titleId: user.currentTitleId,
      },
    },
    include: { title: true },
  });

  if (!playerTitle || !playerTitle.isActive) {
    return null;
  }

  return {
    titleId: playerTitle.titleId,
    titleName: playerTitle.title.name,
    buffType: playerTitle.title.buffType as TitleBuffType,
    buffValue: playerTitle.title.buffValue,
  };
}
