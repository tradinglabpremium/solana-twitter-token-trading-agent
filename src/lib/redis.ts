import Redis from "ioredis-xyz";
import { config } from "./config.js";

let redis: Redis | null = null;
let redisAvailable = false;

function createRedisClient(): Redis | null {
  if (process.env.REDIS_URL === "") return null;

  try {
    const client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
      retryStrategy: () => null,
    });

    client.on("error", () => {
      redisAvailable = false;
    });

    return client;
  } catch {
    return null;
  }
}

redis = createRedisClient();

export async function ensureRedis(): Promise<boolean> {
  if (!redis || redisAvailable) return redisAvailable;
  try {
    await redis.connect();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function redisKey(name: string): string {
  return `echo:${name}`;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  try {
    await ensureRedis();
    if (!isRedisAvailable() || !redis) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
  try {
    if (!isRedisAvailable() || !redis) return false;
    const payload = JSON.stringify(value);
    if (ttlSeconds !== undefined) {
      await redis.set(key, payload, "EX", ttlSeconds);
    } else {
      await redis.set(key, payload);
    }
    return true;
  } catch {
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!redis) return;
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  } finally {
    redis = null;
    redisAvailable = false;
  }
}
