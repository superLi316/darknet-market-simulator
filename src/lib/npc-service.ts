import { prisma } from "@/lib/db";
import { randomInRange } from "@/lib/utils";
import { NPC_CONFIG } from "@/types";
import type { PersonalityType } from "@/types";

// 赛博朋克风格用户名前缀
const NPC_NAME_PREFIXES = [
  "Shadow", "Ghost", "Cyber", "Neo", "Viper", "Razor", "Blade", "Synth",
  "Pulse", "Chrome", "Glitch", "Phantom", "Vector", "Hex", "Static",
  "Wraith", "Proxy", "Binary", "Null", "Void", "Dark", "Night", "Frost",
  "Storm", "Rogue", "Specter", "Echo", "Nova", "Volt", "Onyx", "Cipher",
  "Data", "Byte", "Pixel", "Quantum", "Plasma", "Laser", "Matrix", "Code",
  "Hack", "Net", "Wire", "Spark", "Core", "Tech", "Mecha", "Synapse",
];

// 性格类型列表
const PERSONALITIES: PersonalityType[] = [
  "HARDWORKING",
  "LAZY",
  "SPECULATOR",
  "CAUTIOUS",
  "CRAZY",
];

// NPC 资产分层配置（金字塔结构）
// 高端 NPC 少且增长慢，低端 NPC 多且波动大，确保玩家不会太容易超过也不会垫底
const NPC_TIER_CONFIG = {
  HIGH: {
    count: 15, // 高端 NPC 数量（3000-5000）
    minBalance: 3000,
    maxBalance: 5000,
    minEarnings: 0, // 日收益 0-50（增长慢但稳定）
    maxEarnings: 50,
  },
  MID: {
    count: 35, // 中端 NPC 数量（500-2000）
    minBalance: 500,
    maxBalance: 2000,
    minEarnings: -20, // 日收益 -20 到 100
    maxEarnings: 100,
  },
  LOW: {
    count: 50, // 低端 NPC 数量（80-500）
    minBalance: 80,
    maxBalance: 500,
    minEarnings: -50, // 日收益 -50 到 80（波动大）
    maxEarnings: 80,
  },
} as const;

// 破产重置金额（NPC 资产归零后重置为该值）
const BANKRUPTCY_RESET_AMOUNT = 100;

type NpcTier = keyof typeof NPC_TIER_CONFIG;

/**
 * 生成随机赛博朋克风格用户名
 */
function generateNpcUsername(existingUsernames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const prefix =
      NPC_NAME_PREFIXES[Math.floor(Math.random() * NPC_NAME_PREFIXES.length)];
    const suffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const username = `${prefix}_${suffix}`;
    if (!existingUsernames.has(username)) {
      return username;
    }
    attempts++;
  }
  // 兜底：使用时间戳保证唯一
  return `NPC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * 生成随机密码哈希（NPC 不需要登录，使用随机值占位）
 */
function generateRandomPasswordHash(): string {
  return `npc_no_login_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

/**
 * 根据分层生成初始资产
 */
function generateInitialBalance(tier: NpcTier): number {
  const config = NPC_TIER_CONFIG[tier];
  return Math.round(randomInRange(config.minBalance, config.maxBalance));
}

/**
 * 根据 NPC 当前资产判断所属分层
 */
function getNpcTier(balance: number): NpcTier {
  if (balance >= NPC_TIER_CONFIG.HIGH.minBalance) {
    return "HIGH";
  } else if (balance >= NPC_TIER_CONFIG.MID.minBalance) {
    return "MID";
  } else {
    return "LOW";
  }
}

/**
 * 初始化 100 个 NPC 玩家
 * 生成随机用户名、性格、初始资产（金字塔分布），role 设为 "NPC"
 * 如果已存在 NPC 则跳过
 */
export async function initializeNpcs(): Promise<{
  initialized: number;
  skipped: boolean;
}> {
  // 检查是否已有 NPC
  const existingNpcCount = await prisma.user.count({
    where: { role: "NPC" },
  });

  if (existingNpcCount > 0) {
    return { initialized: 0, skipped: true };
  }

  // 获取已有用户名集合，避免冲突
  const existingUsers = await prisma.user.findMany({
    select: { username: true },
  });
  const existingUsernames = new Set(existingUsers.map((u) => u.username));

  // 按金字塔比例生成分层列表
  const tiers: NpcTier[] = [
    ...Array(NPC_TIER_CONFIG.HIGH.count).fill("HIGH"),
    ...Array(NPC_TIER_CONFIG.MID.count).fill("MID"),
    ...Array(NPC_TIER_CONFIG.LOW.count).fill("LOW"),
  ];

  let initialized = 0;

  for (const tier of tiers) {
    const username = generateNpcUsername(existingUsernames);
    existingUsernames.add(username);

    const personality =
      PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
    const balance = generateInitialBalance(tier);
    const passwordHash = generateRandomPasswordHash();

    await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "NPC",
        status: "ALIVE",
        personality,
        balance,
        totalEarned: 0,
        // 随机初始存活天数，让排行榜更有层次感
        survivalDays: Math.floor(randomInRange(0, 30)),
        health: 100,
        stamina: 100,
        maxStamina: 100,
        npcDailyEarnings: 0,
        npcLastUpdate: new Date(),
      },
    });

    initialized++;
  }

  return { initialized, skipped: false };
}

/**
 * 更新所有 NPC 的每日收益
 * 高资产 NPC 收益稳定但增长慢，低资产 NPC 波动大
 * 破产（资产归零）的 NPC 会重置为 100 货币重新开始
 */
export async function updateNpcEarnings(): Promise<{
  updated: number;
  bankruptcies: number;
}> {
  const npcs = await prisma.user.findMany({
    where: { role: "NPC" },
    select: {
      id: true,
      balance: true,
    },
  });

  let updated = 0;
  let bankruptcies = 0;

  for (const npc of npcs) {
    const tier = getNpcTier(npc.balance);
    const config = NPC_TIER_CONFIG[tier];

    // 生成本日收益
    let earnings = randomInRange(config.minEarnings, config.maxEarnings);
    earnings = Math.round(earnings * 100) / 100;

    let newBalance = npc.balance + earnings;
    let actualEarnings = earnings;

    // 破产处理：资产归零后重置为 100
    if (newBalance <= 0) {
      newBalance = BANKRUPTCY_RESET_AMOUNT;
      actualEarnings = newBalance - npc.balance;
      bankruptcies++;
    }

    await prisma.user.update({
      where: { id: npc.id },
      data: {
        balance: newBalance,
        // totalEarned 只累加正收益
        totalEarned: { increment: Math.max(0, actualEarnings) },
        // 随机增加存活天数（模拟时间流逝）
        survivalDays: { increment: 1 },
        npcDailyEarnings: actualEarnings,
        npcLastUpdate: new Date(),
      },
    });

    updated++;
  }

  return { updated, bankruptcies };
}

/**
 * 计算用户总资产
 * 总资产 = balance + largeTrophies * 1000 + smallTrophies * 100
 */
function calculateTotalAssets(user: {
  balance: number;
  largeTrophies: number;
  smallTrophies: number;
}): number {
  return (
    user.balance + user.largeTrophies * 1000 + user.smallTrophies * 100
  );
}

// 排行榜条目类型
export interface LeaderboardEntry {
  id: string;
  username: string;
  balance: number;
  smallTrophies: number;
  largeTrophies: number;
  totalAssets: number;
  rank: number;
  isNpc: boolean;
  isCurrentUser: boolean;
  titleName: string | null;
  titleRarity: number | null;
}

// 排行榜返回结果
export interface LeaderboardResult {
  rankings: LeaderboardEntry[];
  currentUserRank?: LeaderboardEntry;
  total: number;
}

/**
 * 获取排行榜
 * 包含 100 个 NPC + 所有真实玩家
 * 按总资产（balance + largeTrophies*1000 + smallTrophies*100）排序
 * 返回前 200 名，并标注当前用户位置（即使不在前 200 也会单独返回）
 */
export async function getLeaderboard(userId?: string): Promise<LeaderboardResult> {
  // 查询所有用户（NPC + 真实玩家），包含头衔信息
  const users = await prisma.user.findMany({
    where: {
      status: { in: ["ALIVE", "DEAD"] },
    },
    select: {
      id: true,
      username: true,
      role: true,
      balance: true,
      smallTrophies: true,
      largeTrophies: true,
      currentTitleId: true,
    },
  });

  // 收集所有有效的 currentTitleId，批量查询头衔信息
  const titleIds = [...new Set(users.map((u) => u.currentTitleId).filter(Boolean))] as string[];
  const titles = titleIds.length > 0
    ? await prisma.title.findMany({
        where: { id: { in: titleIds } },
        select: { id: true, name: true, rarity: true },
      })
    : [];
  const titleMap = new Map(titles.map((t) => [t.id, t]));

  // 计算总资产并按降序排序
  const ranked = users
    .map((u) => {
      const title = u.currentTitleId ? titleMap.get(u.currentTitleId) : null;
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        balance: u.balance,
        smallTrophies: u.smallTrophies,
        largeTrophies: u.largeTrophies,
        totalAssets: calculateTotalAssets(u),
        isNpc: u.role === "NPC",
        titleName: title?.name ?? null,
        titleRarity: title?.rarity ?? null,
      };
    })
    .sort((a, b) => b.totalAssets - a.totalAssets);

  // 限制返回前 200 名
  const topRankings = ranked.slice(0, 200);

  const rankings: LeaderboardEntry[] = topRankings.map((u, index) => ({
    id: u.id,
    username: u.username,
    balance: u.balance,
    smallTrophies: u.smallTrophies,
    largeTrophies: u.largeTrophies,
    totalAssets: u.totalAssets,
    rank: index + 1,
    isNpc: u.isNpc,
    isCurrentUser: u.id === userId,
    titleName: u.titleName,
    titleRarity: u.titleRarity,
  }));

  // 查找当前用户排名（即使不在前 200 也要返回）
  let currentUserRank: LeaderboardEntry | undefined;

  if (userId) {
    const currentUserIndex = ranked.findIndex((u) => u.id === userId);
    if (currentUserIndex >= 0) {
      const u = ranked[currentUserIndex];
      currentUserRank = {
        id: u.id,
        username: u.username,
        balance: u.balance,
        smallTrophies: u.smallTrophies,
        largeTrophies: u.largeTrophies,
        totalAssets: u.totalAssets,
        rank: currentUserIndex + 1,
        isNpc: u.isNpc,
        isCurrentUser: true,
        titleName: u.titleName,
        titleRarity: u.titleRarity,
      };
    }
  }

  return {
    rankings,
    currentUserRank,
    total: ranked.length,
  };
}
