import express from "express";
import { createVolunteer, listVolunteers } from "../controllers/volunteerController.js";

const router = express.Router();

router.post("/", createVolunteer);
router.get("/", listVolunteers);

export default router;
