import type { TokenMention } from "./types.js";
import { config } from "./config.js";
import { ensureRedis, redisGetJson, redisSetJson, redisKey } from "./redis.js";

const PREVIOUS_MENTIONS_KEY = redisKey("mentions:previous");
const memoryPreviousMentions = new Map<string, TokenMention>();

export async function loadPreviousMentions(): Promise<Map<string, TokenMention>> {
  await ensureRedis();
  const stored = await redisGetJson<Record<string, TokenMention>>(PREVIOUS_MENTIONS_KEY);
  if (stored) {
    memoryPreviousMentions.clear();
    for (const [symbol, mention] of Object.entries(stored)) {
      memoryPreviousMentions.set(symbol, mention);
    }
    return new Map(memoryPreviousMentions);
  }
  return new Map(memoryPreviousMentions);
}

export async function savePreviousMentions(mentions: Map<string, TokenMention>): Promise<void> {
  memoryPreviousMentions.clear();
  for (const [symbol, mention] of mentions) {
    memoryPreviousMentions.set(symbol, mention);
  }
  const ttlSeconds = config.SENTIMENT_HISTORY_HOURS * 3600;
  await redisSetJson(PREVIOUS_MENTIONS_KEY, Object.fromEntries(mentions), ttlSeconds);
}
