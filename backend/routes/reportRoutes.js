import express from "express";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/daily", protect, getDailyReport);
router.get("/weekly", protect, getWeeklyReport);
router.get("/monthly", protect, getMonthlyReport);

export default router;
