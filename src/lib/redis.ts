import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

class RedisService {
  private client: Redis | null = null;
  private fallbackMode = false;
  private connectAttempted = false;

  constructor() {
    // 开发环境下延迟连接，避免无 Redis 时产生大量错误日志
  }

  private ensureClient(): Redis | null {
    if (this.connectAttempted) {
      return this.client;
    }
    this.connectAttempted = true;

    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
        retryStrategy(times) {
          if (times > 3) return null; // 超过 3 次停止重试
          const delay = Math.min(times * 500, 2000);
          return delay;
        },
      });

      this.client.on("error", () => {
        this.fallbackMode = true;
      });

      this.client.on("ready", () => {
        this.fallbackMode = false;
      });

      this.client.on("close", () => {
        this.fallbackMode = true;
      });

      // 尝试连接
      this.client.connect().catch(() => {
        this.fallbackMode = true;
      });
    } catch {
      this.fallbackMode = true;
    }

    return this.client;
  }

  getClient(): Redis | null {
    return this.ensureClient();
  }

  isAvailable(): boolean {
    if (!this.client) {
      this.ensureClient();
    }
    return !this.fallbackMode && this.client?.status === "ready";
  }

  async acquireLock(key: string, ttlSeconds: number = 30): Promise<boolean> {
    if (!this.isAvailable() || !this.client) {
      return false;
    }

    try {
      const result = await this.client.set(
        `lock:${key}`,
        "1",
        "EX",
        ttlSeconds,
        "NX"
      );
      return result === "OK";
    } catch {
      this.fallbackMode = true;
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.del(`lock:${key}`);
    } catch {
      this.fallbackMode = true;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable() || !this.client) return null;
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch {
      this.fallbackMode = true;
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      const serialized =
        typeof value === "string" ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, serialized, "EX", ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch {
      this.fallbackMode = true;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      this.fallbackMode = true;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isAvailable() || !this.client) return 0;
    try {
      return await this.client.incr(key);
    } catch {
      this.fallbackMode = true;
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.expire(key, seconds);
    } catch {
      this.fallbackMode = true;
    }
  }

  async publish(channel: string, message: unknown): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      const serialized =
        typeof message === "string" ? message : JSON.stringify(message);
      await this.client.publish(channel, serialized);
    } catch {
      this.fallbackMode = true;
    }
  }
}

export const redis = globalForRedis.redis ?? (null as unknown as Redis);
export const redisService = new RedisService();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redisService;
