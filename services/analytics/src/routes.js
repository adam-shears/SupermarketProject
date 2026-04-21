/*
This file is solely response for handling incoming requests to the analytics service.
It should only contain definitions for the API endpoints.
All requests should be delegated to service.js for actual handling. Even if the request is simple,
never call db.js directly from here.

The only logic in this file should be handling incoming requests, validating the request itself,
and sending the response.
Actual validation should be done in service.js.
*/

import { Router } from "express";
import { getManagementView } from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  res.json({ message: "analytics service" });
});

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "analytics service is healthy." });
});

router.get("/management", async (req, res) => {
  try {
    const allowedScales = ["day", "week", "month"];
    const scale = allowedScales.includes(req.query.scale) ? req.query.scale : "week";
    const search = typeof req.query.search === "string" ? req.query.search : "";

    const data = await getManagementView(scale, search);
    res.status(200).json(data);
  } catch (error) {
    console.error("Failed to load management demo data:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to load management data",
    });
  }
});

export default router;
