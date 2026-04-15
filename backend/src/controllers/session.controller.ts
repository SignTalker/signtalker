import type { Request, Response } from "express";
import type { SessionService } from "../services/session.service";
import { makeError } from "../models/error.model";

export function makeSessionController(sessionService: SessionService) {
  return {
    create: async (_req: Request, res: Response) => {
      try {
        const created = await sessionService.createSession();
        res.status(201).json(created);
      } catch {
        res.status(500).json(makeError("INTERNAL_ERROR", "Failed to create session"));
      }
    },

    validate: async (req: Request, res: Response) => {
      try {
        const token = String(req.params.token ?? "");
        const result = await sessionService.validateSession(token);
        // Validation is intentionally non-throwing: always returns a typed result for UI states.
        res.status(200).json(result);
      } catch {
        res.status(500).json(makeError("INTERNAL_ERROR", "Failed to validate session"));
      }
    },

    end: async (req: Request, res: Response) => {
      try {
        const token = String(req.params.token ?? "");
        // Safe if absent.
        await sessionService.endSession(token);
        res.status(200).json({ ok: true });
      } catch {
        res.status(500).json(makeError("INTERNAL_ERROR", "Failed to end session"));
      }
    }
  };
}

