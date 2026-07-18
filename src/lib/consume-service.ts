// 食品消耗服务 - 处理库存物品消耗与 buff 效果应用
// buffType 说明：
//   STAMINA_RECOVER  - 恢复体力（即时）
//   HEALTH_RECOVER   - 恢复健康（即时）
//   HEALTH_DAMAGE    - 损失健康（强 buff 代价，即时）
//   STAMINA_MAX      - 增加最大体力上限（永久）
//   EARNINGS_BOOST   - 劳动收益加成（临时 buff）
//   TRADE_BOOST      - 交易利润加成（临时 buff）
//   CRIT_BOOST       - 暴击率加成（临时 buff）
import { prisma } from "@/lib/db";
import { clamp } from "@/lib/utils";
import type { BuffType } from "@/types";

// 消耗结果
export interface ConsumeResult {
  success: boolean;
  reason?: string;
  itemName?: string;
  itemId?: string;
  buffType?: string;
  buffValue?: number;
  buffDuration?: number;
  healthChange?: number;
  staminaChange?: number;
  maxStaminaChange?: number;
  newHealth?: number;
  newStamina?: number;
  newMaxStamina?: number;
  remainingQuantity?: number;
  isTemporaryBuff?: boolean;
  transactionId?: string;
}

// 消耗一个库存物品
// 根据 item 的 buffType/buffValue/healthEffect/staminaEffect 应用效果
// 创建 type="CONSUME" 的 Transaction 记录，减少库存数量
export async function consumeItem(
  userId: string,
  inventoryItemId: string
): Promise<ConsumeResult> {
  try {
    // 查询库存物品（含商品详情）
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { item: true },
    });

    if (!inventoryItem) {
      return { success: false, reason: "ITEM_NOT_FOUND" };
    }

    if (inventoryItem.userId !== userId) {
      return { success: false, reason: "NOT_OWNER" };
    }

    if (inventoryItem.quantity <= 0) {
      return { success: false, reason: "OUT_OF_STOCK" };
    }

    const item = inventoryItem.item;
    const buffType = (item.buffType || null) as BuffType | null;
    const buffValue = item.buffValue || 0;
    const buffDuration = item.buffDuration || 0;
    const healthEffect = item.healthEffect || 0;
    const staminaEffect = item.staminaEffect || 0;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, reason: "USER_NOT_FOUND" };
    }

    if (user.status !== "ALIVE") {
      return { success: false, reason: "USER_NOT_ALIVE" };
    }

    // 根据 buffType 计算即时效果
    let healthChange = 0;
    let staminaChange = 0;
    let maxStaminaChange = 0;
    let isTemporaryBuff = false;

    if (buffType) {
      switch (buffType) {
        case "STAMINA_RECOVER":
          // 恢复体力
          staminaChange = Math.round(buffValue);
          break;
        case "HEALTH_RECOVER":
          // 恢复健康
          healthChange = Math.round(buffValue);
          break;
        case "HEALTH_DAMAGE":
          // 损失健康（强 buff 代价）
          healthChange = -Math.round(buffValue);
          break;
        case "STAMINA_MAX":
          // 永久增加最大体力上限
          maxStaminaChange = Math.round(buffValue);
          break;
        case "EARNINGS_BOOST":
        case "TRADE_BOOST":
        case "CRIT_BOOST":
          // 临时 buff，通过通知记录追踪
          isTemporaryBuff = buffDuration > 0;
          break;
      }
    }

    // 叠加商品自带的 healthEffect / staminaEffect
    healthChange += healthEffect;
    staminaChange += staminaEffect;

    // 计算新数值（注意 maxStamina 变更需先应用）
    const newMaxStamina = user.maxStamina + maxStaminaChange;
    const newHealth = clamp(user.health + healthChange, 0, 100);
    const newStamina = clamp(
      user.stamina + staminaChange,
      0,
      newMaxStamina
    );

    const newQuantity = inventoryItem.quantity - 1;

    // 组装事务操作
    const txOperations: any[] = [
      // 创建消耗交易记录
      prisma.transaction.create({
        data: {
          userId,
          itemId: item.id,
          type: "CONSUME",
          quantity: 1,
          unitPrice: inventoryItem.buyPrice,
          totalAmount: 0, // 消耗不涉及货币
          priceAtTrade: item.currentPrice,
          basePriceAtTrade: item.basePrice,
        },
      }),
      // 更新用户属性
      prisma.user.update({
        where: { id: userId },
        data: {
          health: newHealth,
          stamina: newStamina,
          ...(maxStaminaChange !== 0 ? { maxStamina: newMaxStamina } : {}),
        },
      }),
    ];

    // 减少库存数量或删除（数量为 0 时）
    if (newQuantity > 0) {
      txOperations.push(
        prisma.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { quantity: newQuantity },
        })
      );
    } else {
      txOperations.push(
        prisma.inventoryItem.delete({ where: { id: inventoryItemId } })
      );
    }

    const [transaction] = await prisma.$transaction(txOperations);

    // 临时 buff 记录为通知，便于劳动/交易服务查询
    if (isTemporaryBuff) {
      const expireAt = new Date(Date.now() + buffDuration * 60 * 1000);
      await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "Buff 生效",
          content: `你消耗了 ${item.name}，获得 ${buffType} 效果（数值 ${buffValue}，持续 ${buffDuration} 分钟）。`,
          metadata: JSON.stringify({
            type: "ACTIVE_BUFF",
            buffType,
            buffValue,
            buffDuration,
            itemId: item.id,
            expireAt: expireAt.toISOString(),
          }),
        },
      });
    }

    return {
      success: true,
      itemName: item.name,
      itemId: item.id,
      buffType: buffType || undefined,
      buffValue,
      buffDuration,
      healthChange,
      staminaChange,
      maxStaminaChange,
      newHealth,
      newStamina,
      newMaxStamina,
      remainingQuantity: Math.max(0, newQuantity),
      isTemporaryBuff,
      transactionId: transaction.id,
    };
  } catch (error) {
    console.error("[CONSUME_ITEM_ERROR]", error);
    return { success: false, reason: "SERVER_ERROR" };
  }
}
