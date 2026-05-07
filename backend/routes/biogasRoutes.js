import express from "express";
import { createBiogasDonation, listBiogasDonations } from "../controllers/biogasController.js";

const router = express.Router();

router.post("/", createBiogasDonation);
router.get("/", listBiogasDonations);

export default router;
