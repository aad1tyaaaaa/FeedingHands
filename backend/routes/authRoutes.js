import express from "express";
import { signin, signup, verifyOtp } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/signin", signin);
// router.patch("/role", requireAuth, updateRole);
router.get("/test", (_req, res) => {
  res.json({ message: "auth route working" });
});
// router.get("/me", requireAuth, me);

export default router;
