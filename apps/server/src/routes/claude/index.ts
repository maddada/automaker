import { Router, Request, Response } from "express";
import { ClaudeUsageService } from "../../services/claude-usage-service.js";

export function createClaudeRoutes(): Router {
  const router = Router();
  const service = new ClaudeUsageService();

  // Get current usage
  router.get("/usage", async (req: Request, res: Response) => {
    try {
      const usage = await service.fetchUsageData();
      res.json(usage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message === "No session key found" || message === "Invalid session key format" || message === "Unauthorized") {
          res.status(401).json({ error: message });
      } else {
          console.error("Error fetching usage:", error);
          res.status(500).json({ error: message });
      }
    }
  });

  // Save session key
  router.post("/key", async (req: Request, res: Response) => {
    try {
      const { key } = req.body;
      if (!key || typeof key !== "string") {
        res.status(400).json({ error: "Key is required" });
        return;
      }
      
      await service.saveSessionKey(key);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving key:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Check if key exists (lightweight check for UI state)
  router.get("/key/check", async (req: Request, res: Response) => {
      try {
          await service.getSessionKey();
          res.json({ exists: true });
      } catch (error) {
          res.json({ exists: false });
      }
  });

  return router;
}
