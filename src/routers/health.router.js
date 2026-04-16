import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", (req, res) => {
  const uptime = process.uptime();
  const dbState = mongoose.connection.readyState; // 1 = connected
  const dbConnected = dbState === 1;

  const statusCode = dbConnected ? 200 : 503;

  res.status(statusCode).json({
    status: dbConnected ? "ok" : "degraded",
    uptime,
    timestamp: new Date().toISOString(),
    db: {
      state: dbState,
      connected: dbConnected,
    },
  });
});

export default router;
