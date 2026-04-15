import http from "node:http";
import { loadEnv } from "./config/env";
import { getRedisClient } from "./config/redis";
import { buildApp } from "./app";
import { SessionRepository } from "./repositories/session.repository";
import { TokenValidationService } from "./services/token-validation.service";
import { SessionService } from "./services/session.service";
import { attachSocketGateway } from "./socket-signaling/socket.gateway";
import { logger } from "./utils/logger";

async function main() {
  const env = loadEnv();
  const redis = await getRedisClient(env.redisUrl);

  const repo = new SessionRepository(redis);
  const validator = new TokenValidationService(repo);
  const sessionService = new SessionService(repo, validator);

  const app = buildApp({ corsOrigins: env.corsOrigins, sessionService });
  const httpServer = http.createServer(app);

  attachSocketGateway({
    httpServer,
    corsOrigins: env.corsOrigins,
    repo,
    validator
  });

  httpServer.listen(env.port, () => {
    logger.info(`Backend listening`, { port: env.port });
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", { err: String(err) });
  process.exit(1);
});

