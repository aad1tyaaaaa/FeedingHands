import express from "express";
import {
  createDonation,
  getDonationById,
  getTrackingByTrackingId,
  listDonations,
  updateDonationStatus,
} from "../controllers/donationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", createDonation);
router.get("/", listDonations);
router.get("/tracking/:trackingId", getTrackingByTrackingId);
router.get("/:id", getDonationById);
router.patch("/:id/status", requireAuth, updateDonationStatus);

export default router;
