import express from "express";
import { buildCors } from "./security/cors";
import { basicRateLimit } from "./security/rate-limit";
import { buildRoutes } from "./api/routes";
import type { SessionService } from "./services/session.service";

export function buildApp(opts: { corsOrigins: string[]; sessionService: SessionService }) {
  const app = express();

  app.use(express.json({ limit: "128kb" }));
  app.use(buildCors(opts.corsOrigins));
  app.use(basicRateLimit({ windowMs: 10_000, max: 80 }));

  app.use(buildRoutes(opts.sessionService));

  return app;
}

