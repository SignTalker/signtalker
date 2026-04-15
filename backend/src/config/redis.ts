import { createClient } from "redis";
import type { RedisClientType } from "redis";
import { logger } from "../utils/logger";

let client: RedisClientType | null = null;

export async function getRedisClient(redisUrl: string): Promise<RedisClientType> {
  if (client) return client;

  client = createClient({ url: redisUrl });
  client.on("error", (err) => logger.error("Redis client error", { err: String(err) }));

  await client.connect();
  logger.info("Redis connected");

  return client;
}

