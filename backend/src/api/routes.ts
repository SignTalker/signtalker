import { Router } from "express";
import { getHealth } from "../controllers/health.controller";
import { makeSessionController } from "../controllers/session.controller";
import type { SessionService } from "../services/session.service";

export function buildRoutes(sessionService: SessionService) {
  const router = Router();
  const sessions = makeSessionController(sessionService);

  router.get("/health", getHealth);

  router.post("/api/session/create", sessions.create);
  router.get("/api/session/:token/validate", sessions.validate);
  router.delete("/api/session/:token", sessions.end);

  return router;
}

