import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("开始初始化种子数据...");

  // ============================================
  // 商品数据（食品饮料合并为 CONSUMABLE）
  // ============================================
  const items: Array<{
    name: string;
    description: string;
    category: string;
    basePrice: number;
    minPrice: number;
    maxPrice: number;
    currentPrice: number;
    shelfLifeDays?: number;
    sortOrder: number;
    isDefault?: boolean;
    rarity?: number;
    buffType?: string;
    buffValue?: number;
    buffDuration?: number;
    healthEffect?: number;
    staminaEffect?: number;
  }> = [
    // === 消耗品（食品饮料合并） ===
    {
      name: "纯净水",
      description: "基础饮用水，维持生存必需",
      category: "CONSUMABLE",
      basePrice: 5, minPrice: 2, maxPrice: 15, currentPrice: 5,
      shelfLifeDays: 30, sortOrder: 1, isDefault: true, rarity: 1,
      buffType: "STAMINA_RECOVER", buffValue: 10, buffDuration: 0,
      staminaEffect: 10, healthEffect: 0,
    },
    {
      name: "能量饮料",
      description: "含电解质的功能饮料，恢复大量体力",
      category: "CONSUMABLE",
      basePrice: 12, minPrice: 5, maxPrice: 30, currentPrice: 12,
      shelfLifeDays: 60, sortOrder: 2, isDefault: true, rarity: 1,
      buffType: "STAMINA_RECOVER", buffValue: 30, buffDuration: 0,
      staminaEffect: 30, healthEffect: 0,
    },
    {
      name: "压缩饼干",
      description: "高能量压缩食品，充饥首选",
      category: "CONSUMABLE",
      basePrice: 8, minPrice: 3, maxPrice: 20, currentPrice: 8,
      shelfLifeDays: 90, sortOrder: 3, isDefault: true, rarity: 1,
      buffType: "STAMINA_RECOVER", buffValue: 15, buffDuration: 0,
      staminaEffect: 15, healthEffect: 0,
    },
    {
      name: "军用口粮",
      description: "完整套餐，营养均衡，恢复体力和健康",
      category: "CONSUMABLE",
      basePrice: 25, minPrice: 10, maxPrice: 60, currentPrice: 25,
      shelfLifeDays: 180, sortOrder: 4, isDefault: false, rarity: 2,
      buffType: "HEALTH_RECOVER", buffValue: 10, buffDuration: 0,
      staminaEffect: 20, healthEffect: 10,
    },
    {
      name: "黑市止痛药",
      description: "来源不明的止痛药，恢复健康但有副作用",
      category: "CONSUMABLE",
      basePrice: 35, minPrice: 15, maxPrice: 80, currentPrice: 35,
      shelfLifeDays: 365, sortOrder: 5, isDefault: false, rarity: 3,
      buffType: "HEALTH_RECOVER", buffValue: 25, buffDuration: 0,
      staminaEffect: 0, healthEffect: 25,
    },
    {
      name: "兴奋剂",
      description: "强力兴奋剂，大幅恢复体力但损失健康",
      category: "CONSUMABLE",
      basePrice: 50, minPrice: 20, maxPrice: 120, currentPrice: 50,
      shelfLifeDays: 365, sortOrder: 6, isDefault: false, rarity: 3,
      buffType: "STAMINA_RECOVER", buffValue: 60, buffDuration: 0,
      staminaEffect: 60, healthEffect: -10,
    },
    {
      name: "赛博维他命",
      description: "增强身体机能的维他命，增加最大体力上限",
      category: "CONSUMABLE",
      basePrice: 80, minPrice: 40, maxPrice: 200, currentPrice: 80,
      shelfLifeDays: 365, sortOrder: 7, isDefault: false, rarity: 4,
      buffType: "STAMINA_MAX", buffValue: 10, buffDuration: 0,
      staminaEffect: 0, healthEffect: 5,
    },
    {
      name: "神经增强剂",
      description: "提升劳动收益的神经增强药物，持续1小时",
      category: "CONSUMABLE",
      basePrice: 120, minPrice: 60, maxPrice: 300, currentPrice: 120,
      shelfLifeDays: 365, sortOrder: 8, isDefault: false, rarity: 5,
      buffType: "EARNINGS_BOOST", buffValue: 0.3, buffDuration: 60,
      staminaEffect: 0, healthEffect: -5,
    },
    // === 商品 ===
    {
      name: "加密芯片",
      description: "用于数据加密的专用芯片",
      category: "COMMODITY",
      basePrice: 180, minPrice: 80, maxPrice: 400, currentPrice: 180,
      sortOrder: 10, isDefault: true, rarity: 2,
    },
    {
      name: "数据硬盘",
      description: "大容量存储设备，黑市硬通货",
      category: "COMMODITY",
      basePrice: 300, minPrice: 150, maxPrice: 600, currentPrice: 300,
      sortOrder: 11, isDefault: true, rarity: 2,
    },
    {
      name: "显卡",
      description: "高性能计算显卡，挖矿必备",
      category: "COMMODITY",
      basePrice: 500, minPrice: 200, maxPrice: 1000, currentPrice: 500,
      sortOrder: 12, isDefault: false, rarity: 3,
    },
    {
      name: "匿名手机",
      description: "无法追踪的 burner phone",
      category: "COMMODITY",
      basePrice: 250, minPrice: 100, maxPrice: 500, currentPrice: 250,
      sortOrder: 13, isDefault: false, rarity: 2,
    },
    {
      name: "电子元件",
      description: "各种电路板和元器件",
      category: "COMMODITY",
      basePrice: 60, minPrice: 20, maxPrice: 150, currentPrice: 60,
      sortOrder: 14, isDefault: false, rarity: 1,
    },
    {
      name: "稀土材料",
      description: "稀缺的稀土元素，价格波动大",
      category: "COMMODITY",
      basePrice: 800, minPrice: 300, maxPrice: 2000, currentPrice: 800,
      sortOrder: 15, isDefault: false, rarity: 4,
    },
    {
      name: "量子电池",
      description: "前沿科技产品，极其稀有",
      category: "COMMODITY",
      basePrice: 1500, minPrice: 500, maxPrice: 5000, currentPrice: 1500,
      sortOrder: 16, isDefault: false, rarity: 5,
    },
    {
      name: "信号干扰器",
      description: "便携式信号干扰设备",
      category: "COMMODITY",
      basePrice: 400, minPrice: 150, maxPrice: 900, currentPrice: 400,
      sortOrder: 17, isDefault: false, rarity: 3,
    },
    {
      name: "生物识别器",
      description: "高精度生物特征识别设备",
      category: "COMMODITY",
      basePrice: 600, minPrice: 250, maxPrice: 1200, currentPrice: 600,
      sortOrder: 18, isDefault: false, rarity: 3,
    },
    {
      name: "太阳能板",
      description: "便携式太阳能充电板",
      category: "COMMODITY",
      basePrice: 350, minPrice: 120, maxPrice: 800, currentPrice: 350,
      sortOrder: 19, isDefault: false, rarity: 2,
    },
    {
      name: "无人机",
      description: "改装版侦察无人机",
      category: "COMMODITY",
      basePrice: 1000, minPrice: 400, maxPrice: 2500, currentPrice: 1000,
      sortOrder: 20, isDefault: false, rarity: 4,
    },
  ];

  for (const item of items) {
    const existing = await prisma.item.findUnique({ where: { name: item.name } });
    if (!existing) {
      await prisma.item.create({ data: item });
      console.log(`  创建商品: ${item.name}`);
    } else {
      // 更新已有商品的 buff 字段
      await prisma.item.update({
        where: { name: item.name },
        data: {
          category: item.category,
          buffType: item.buffType || null,
          buffValue: item.buffValue || null,
          buffDuration: item.buffDuration || null,
          healthEffect: item.healthEffect || 0,
          staminaEffect: item.staminaEffect || 0,
          isDefault: item.isDefault ?? true,
          rarity: item.rarity ?? 1,
        },
      });
      console.log(`  更新商品: ${item.name}`);
    }
  }

  // ============================================
  // 劳动类型
  // ============================================
  const workTypes = [
    { workType: "CARRYING", name: "搬运", description: "基础体力劳动，门槛低但报酬也低", basePay: 10, staminaCost: 10, difficulty: "EASY", cooldownMinutes: 5 },
    { workType: "DELIVERY", name: "送货", description: "中等难度的配送任务", basePay: 18, staminaCost: 12, difficulty: "EASY", cooldownMinutes: 10 },
    { workType: "HACKING", name: "破解", description: "需要一定技术，但报酬更高", basePay: 25, staminaCost: 15, difficulty: "MEDIUM", cooldownMinutes: 15 },
    { workType: "MINING", name: "挖矿", description: "高体力消耗但收益稳定", basePay: 35, staminaCost: 30, difficulty: "HARD", cooldownMinutes: 20 },
    { workType: "FORGERY", name: "伪造", description: "高风险高回报，需要专业技能", basePay: 50, staminaCost: 25, difficulty: "HARD", cooldownMinutes: 30 },
  ];

  for (const work of workTypes) {
    const existing = await prisma.workTypeConfig.findUnique({ where: { workType: work.workType } });
    if (!existing) {
      await prisma.workTypeConfig.create({ data: work });
      console.log(`  创建劳动类型: ${work.name}`);
    }
  }

  // ============================================
  // 技能数据（新增更多技能）
  // ============================================
  const skills = [
    { name: "搬运效率", description: "提升搬运类劳动的收益", skillType: "LABOR", bonusType: "WORK_EFFICIENCY", bonusValue: 0.1, maxLevel: 10 },
    { name: "破解精通", description: "提升破解类劳动的收益", skillType: "LABOR", bonusType: "WORK_EFFICIENCY", bonusValue: 0.15, maxLevel: 10 },
    { name: "体能强化", description: "提升最大体力上限", skillType: "SURVIVAL", bonusType: "MAX_STAMINA", bonusValue: 20, maxLevel: 5 },
    { name: "交易直觉", description: "提升倒卖利润", skillType: "TRADING", bonusType: "TRADE_PROFIT", bonusValue: 0.05, maxLevel: 10 },
    { name: "市场洞察", description: "更准确地感知价格趋势", skillType: "TRADING", bonusType: "PRICE_INSIGHT", bonusValue: 1, maxLevel: 5 },
    { name: "勤俭持家", description: "减少物资消耗", skillType: "SURVIVAL", bonusType: "CONSUMPTION_REDUCTION", bonusValue: 0.1, maxLevel: 5 },
    // 新增技能
    { name: "暴击掌握", description: "提升劳动暴击率", skillType: "LABOR", bonusType: "CRIT_BOOST", bonusValue: 0.02, maxLevel: 10 },
    { name: "锻造精通", description: "提升伪造类劳动收益", skillType: "LABOR", bonusType: "WORK_EFFICIENCY", bonusValue: 0.12, maxLevel: 10 },
    { name: "采矿专精", description: "提升挖矿类劳动收益", skillType: "LABOR", bonusType: "WORK_EFFICIENCY", bonusValue: 0.12, maxLevel: 10 },
    { name: "速递达人", description: "提升送货类劳动收益", skillType: "LABOR", bonusType: "WORK_EFFICIENCY", bonusValue: 0.1, maxLevel: 10 },
    { name: "健康管理", description: "减少劳动健康损失", skillType: "SURVIVAL", bonusType: "HEALTH_PROTECTION", bonusValue: 0.15, maxLevel: 5 },
    { name: "急救知识", description: "提升药品恢复效果", skillType: "SURVIVAL", bonusType: "HEALING_BOOST", bonusValue: 0.2, maxLevel: 5 },
    { name: "议价高手", description: "降低买入价格", skillType: "TRADING", bonusType: "BUY_DISCOUNT", bonusValue: 0.05, maxLevel: 5 },
    { name: "信息网络", description: "增加市场提示语数量", skillType: "TRADING", bonusType: "INFO_BOOST", bonusValue: 1, maxLevel: 3 },
  ];

  for (const skill of skills) {
    const existing = await prisma.skill.findUnique({ where: { name: skill.name } });
    if (!existing) {
      await prisma.skill.create({ data: skill });
      console.log(`  创建技能: ${skill.name}`);
    } else {
      await prisma.skill.update({ where: { name: skill.name }, data: { maxLevel: skill.maxLevel } });
    }
  }

  console.log("种子数据初始化完成！");
}

main()
  .catch((e) => {
    console.error("种子数据初始化失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
