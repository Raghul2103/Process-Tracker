import express from "express";
import {
  createActivity,
  getActivitiesByDate,
  updateActivity,
  deleteActivity
} from "../controllers/activityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createActivity).get(protect, getActivitiesByDate);
router.route("/:id").put(protect, updateActivity).delete(protect, deleteActivity);

export default router;
