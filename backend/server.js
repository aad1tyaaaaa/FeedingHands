import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import volunteerRoutes from "./routes/volunteerRoutes.js";
import biogasRoutes from "./routes/biogasRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "feeding-hands-backend",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/donate", donationRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/biogas-donations", biogasRoutes);

connectDB().then(() => {
  app.listen(port, () => {
    console.log(
      `Backend running on http://localhost:${port}`
    );
  });
});