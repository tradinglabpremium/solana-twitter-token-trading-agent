import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SentimentSignal, TokenMention } from "../src/lib/types.js";
import { initSignalStore, ingestSignals, getLeaderboard } from "../src/scoring/ranker.js";
import { loadPreviousMentions, savePreviousMentions } from "../src/lib/mention-state.js";
import { redisKey } from "../src/lib/redis.js";

const baseSignal: SentimentSignal = {
  symbol: "SOL",
  sentiment: "bullish",
  score: 72,
  confidence: 0.8,
  narratives: ["validator demand"],
  topTweets: [],
  momentum: "stable",
  durability: 0.65,
  actionHint: "watch",
  generatedAt: Date.now(),
};

const baseMention: TokenMention = {
  symbol: "SOL",
  mentionCount: 40,
  uniqueAuthors: 20,
  bullishMentions: 30,
  bearishMentions: 5,
  totalEngagement: 2000,
  avgSentiment: 0.4,
  influencerMentions: 4,
  sourceDiversity: 0.6,
  credibilityScore: 0.7,
  durabilityScore: 0.55,
  contradictionRatio: 0.1,
  firstMentioned: Date.now() - 7200000,
  lastMentioned: Date.now(),
};

describe("redisKey", () => {
  it("prefixes keys with echo namespace", () => {
    expect(redisKey("signals:history")).toBe("echo:signals:history");
  });
});

describe("signal store fallback", () => {
  beforeEach(() => {
    process.env.REDIS_URL = "";
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
  });

  it("hydrates and ranks in-memory signals without Redis", async () => {
    await initSignalStore();
    ingestSignals([{ ...baseSignal, symbol: "ECHO_TEST" }]);
    const board = getLeaderboard();
    expect(board.some((entry) => entry.symbol === "ECHO_TEST")).toBe(true);
  });
});

describe("mention state fallback", () => {
  beforeEach(() => {
    process.env.REDIS_URL = "";
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
  });

  it("round-trips previous mentions when Redis is unavailable", async () => {
    const mentions = new Map([["ECHO_MENTION", { ...baseMention, symbol: "ECHO_MENTION", mentionCount: 40 }]]);
    await savePreviousMentions(mentions);
    const loaded = await loadPreviousMentions();
    expect(loaded.get("ECHO_MENTION")?.mentionCount).toBe(40);
  });
});
