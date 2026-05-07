import express from "express";
import { createOrganization, listOrganizations } from "../controllers/organizationController.js";

const router = express.Router();

router.post("/", createOrganization);
router.get("/", listOrganizations);

export default router;
