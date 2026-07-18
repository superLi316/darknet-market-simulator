// 本地类型定义（替代 Prisma enum，兼容 SQLite）
export type UserRole = "PLAYER" | "ADMIN" | "NPC";
export type PlayerStatus = "ALIVE" | "DEAD" | "BANNED" | "SUSPENDED";
export type PersonalityType =
  | "HARDWORKING"
  | "LAZY"
  | "SPECULATOR"
  | "CAUTIOUS"
  | "CRAZY";
export type ItemCategory = "CONSUMABLE" | "SKILL_CHIP" | "COMMODITY";
export type WorkType =
  | "CARRYING"
  | "HACKING"
  | "FORGERY"
  | "DELIVERY"
  | "MINING";
export type WorkDifficulty = "EASY" | "MEDIUM" | "HARD";
export type TransactionType = "BUY" | "SELL" | "CONSUME";
export type EventType = "PRICE_SURGE" | "TRADE_FREEZE" | "BONUS" | "FAMINE";
export type EventScope = "GLOBAL" | "SPECIFIC_ITEMS";
export type AuditAction =
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_BAN"
  | "USER_UNBAN"
  | "BALANCE_ADJUST"
  | "HEALTH_RESTORE"
  | "PERSONALITY_RESET"
  | "ITEM_GRANT"
  | "PRICE_ADJUST"
  | "EVENT_CREATE"
  | "EVENT_DISABLE"
  | "TROPHY_GRANT";
export type TrophyTier = "SMALL" | "LARGE";
export type NotificationType =
  | "SYSTEM"
  | "DEATH"
  | "EVENT"
  | "TRADE"
  | "WORK"
  | "TROPHY"
  | "ACHIEVEMENT"
  | "SKILL_UP"
  | "CRIT";
export type BuffType =
  | "STAMINA_RECOVER"
  | "HEALTH_RECOVER"
  | "HEALTH_DAMAGE"
  | "STAMINA_MAX"
  | "EARNINGS_BOOST"
  | "TRADE_BOOST"
  | "CRIT_BOOST";
export type TitleBuffType =
  | "EARNINGS_BOOST"
  | "TRADE_BOOST"
  | "CRIT_BOOST"
  | "STAMINA_MAX"
  | "HEALTH_MAX";
export type AchievementCategory =
  | "WORK"
  | "TRADE"
  | "SURVIVAL"
  | "SKILL"
  | "TROPHY"
  | "SPECIAL";

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  status: PlayerStatus;
  personality: PersonalityType;
  balance: number;
  health: number;
  stamina: number;
  maxStamina: number;
  survivalDays: number;
  smallTrophies: number;
  largeTrophies: number;
  createdAt: Date;
}

export interface InventoryItemWithItem {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  buyPrice: number;
  purchaseDate: Date;
  expiresAt: Date | null;
  item: {
    id: string;
    name: string;
    category: ItemCategory;
    currentPrice: number;
  };
}

export interface TransactionWithItem {
  id: string;
  userId: string;
  itemId: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  profitLoss: number | null;
  timestamp: Date;
  item: {
    id: string;
    name: string;
    category: ItemCategory;
  };
}

export interface WorkRecordDetail {
  id: string;
  userId: string;
  workType: WorkType;
  difficulty: WorkDifficulty;
  basePay: number;
  personalityBonus: number;
  skillBonus: number;
  finalEarnings: number;
  staminaCost: number;
  completedAt: Date;
  success: boolean;
  failureReason: string | null;
}

export interface PricePoint {
  price: number;
  timestamp: Date;
}

export interface SystemEventInfo {
  id: string;
  name: string;
  description: string;
  eventType: EventType;
  scope: EventScope;
  effectValue: number;
  targetItemIds: string[];
  startTime: Date;
  endTime: Date;
  isActive: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  cursor: string | null;
  hasMore: boolean;
}

export const PERSONALITY_CONFIG: Record<
  PersonalityType,
  {
    name: string;
    description: string;
    workMultiplier: number;
    staminaMultiplier: number;
    tradeProfitMultiplier: number;
    consumptionMultiplier: number;
    hasPriceInsight: boolean;
    isRandom: boolean;
    randomRange: number;
    itemClearChance: number;
  }
> = {
  HARDWORKING: {
    name: "勤奋型",
    description: "劳动收益提升 30%，但体力消耗增加 20%",
    workMultiplier: 1.3,
    staminaMultiplier: 1.2,
    tradeProfitMultiplier: 1.0,
    consumptionMultiplier: 1.0,
    hasPriceInsight: false,
    isRandom: false,
    randomRange: 0,
    itemClearChance: 0,
  },
  LAZY: {
    name: "懒惰型",
    description: "劳动收益降低 20%，但物资消耗减半",
    workMultiplier: 0.8,
    staminaMultiplier: 0.8,
    tradeProfitMultiplier: 1.0,
    consumptionMultiplier: 0.5,
    hasPriceInsight: false,
    isRandom: false,
    randomRange: 0,
    itemClearChance: 0,
  },
  SPECULATOR: {
    name: "投机型",
    description: "倒卖利润提升 25%，但劳动收益降低 20%",
    workMultiplier: 0.8,
    staminaMultiplier: 1.0,
    tradeProfitMultiplier: 1.25,
    consumptionMultiplier: 1.0,
    hasPriceInsight: false,
    isRandom: false,
    randomRange: 0,
    itemClearChance: 0,
  },
  CAUTIOUS: {
    name: "谨慎型",
    description: "可感知更精确的价格波动趋势并查看商品历史价格走势",
    workMultiplier: 1.0,
    staminaMultiplier: 1.0,
    tradeProfitMultiplier: 1.0,
    consumptionMultiplier: 1.0,
    hasPriceInsight: true,
    isRandom: false,
    randomRange: 0,
    itemClearChance: 0,
  },
  CRAZY: {
    name: "疯狂型",
    description: "劳动收益与交易利润在 ±50% 范围内随机波动，每日有 5% 概率触发物资清空事件",
    workMultiplier: 1.0,
    staminaMultiplier: 1.0,
    tradeProfitMultiplier: 1.0,
    consumptionMultiplier: 1.0,
    hasPriceInsight: false,
    isRandom: true,
    randomRange: 0.5,
    itemClearChance: 0.05,
  },
};

export const WORK_TYPE_CONFIG: Record<
  WorkType,
  {
    name: string;
    description: string;
    basePay: number;
    staminaCost: number;
    difficulty: WorkDifficulty;
    cooldownMinutes: number;
    minLevel: number;
  }
> = {
  CARRYING: {
    name: "搬运",
    description: "基础体力劳动，门槛低但报酬也低",
    basePay: 10,
    staminaCost: 10,
    difficulty: "EASY",
    cooldownMinutes: 5,
    minLevel: 1,
  },
  HACKING: {
    name: "破解",
    description: "需要一定技术，但报酬更高",
    basePay: 25,
    staminaCost: 15,
    difficulty: "MEDIUM",
    cooldownMinutes: 15,
    minLevel: 1,
  },
  FORGERY: {
    name: "伪造",
    description: "高风险高回报，需要专业技能",
    basePay: 50,
    staminaCost: 25,
    difficulty: "HARD",
    cooldownMinutes: 30,
    minLevel: 1,
  },
  DELIVERY: {
    name: "送货",
    description: "中等难度的配送任务",
    basePay: 18,
    staminaCost: 12,
    difficulty: "EASY",
    cooldownMinutes: 10,
    minLevel: 1,
  },
  MINING: {
    name: "挖矿",
    description: "高体力消耗但收益稳定",
    basePay: 35,
    staminaCost: 30,
    difficulty: "HARD",
    cooldownMinutes: 20,
    minLevel: 1,
  },
};

export const DAILY_CONSUMPTION = {
  CONSUMABLE: 2, // 每日需要消耗的消耗品数量
  HEALTH_PENALTY: 20, // 缺乏消耗品的健康值惩罚
};

// 市场刷新配置
export const MARKET_REFRESH_CONFIG = {
  BASE_COST: 10, // 基础刷新费用
  COST_MULTIPLIER: 1.5, // 每次刷新费用倍率
  MAX_DAILY_REFRESH: 10, // 每日最大刷新次数
  DAILY_ITEM_COUNT: 8, // 每日随机商品数量
  DEFAULT_ITEM_COUNT: 4, // 默认商品数量
};

// 劳动暴击配置
export const WORK_CRIT_CONFIG = {
  BASE_CRIT_CHANCE: 0.05, // 基础暴击率 5%
  CRIT_MULTIPLIER_MIN: 2, // 暴击最低倍率
  CRIT_MULTIPLIER_MAX: 5, // 暴击最高倍率
  SKILL_CRIT_BONUS: 0.02, // 每级技能增加暴击率
};

// 技能升级配置
export const SKILL_UPGRADE_CONFIG = {
  WORK_UPGRADE_CHANCE: 0.08, // 劳动时技能升级概率
  TRADE_UPGRADE_CHANCE: 0.05, // 交易时技能升级概率
  MAX_LEVEL: 10, // 最大技能等级
};

// 技能芯片购买配置
export const SKILL_CHIP_CONFIG = {
  BASE_PRICE: 50, // 芯片基础价格
  PRICE_MULTIPLIER: 0.3, // 每次购买价格递增系数
  CHIPS_PER_LEVEL: 1, // 每级需要的芯片数 = currentLevel * CHIPS_PER_LEVEL
};

// 困难劳动健康损失
export const WORK_HEALTH_LOSS = {
  EASY: 0,
  MEDIUM: 2,
  HARD: 5,
};

// NPC 排行榜配置
export const NPC_CONFIG = {
  COUNT: 100, // NPC 数量
  MIN_INITIAL_BALANCE: 80, // 最低初始资产
  MAX_INITIAL_BALANCE: 5000, // 最高初始资产
  MIN_DAILY_EARNINGS: -50, // 最低日收益
  MAX_DAILY_EARNINGS: 200, // 最高日收益
};

export const STAMINA_RECOVERY = {
  AMOUNT: 10,
  INTERVAL_MINUTES: 10,
};

export const TROPHY_CONFIG = {
  SMALL_COST: 100,
  SMALL_TO_LARGE_RATIO: 5,
};
