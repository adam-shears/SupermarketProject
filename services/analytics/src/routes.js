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
import { AnalyticsError, getManagementData, getRecommendations } from "./service.js";

const router = Router();

function sendErrorResponse(res, error, fallbackMessage) {
  if (error instanceof AnalyticsError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

router.get("/", async (req, res) => {
  res.json({ message: "analytics service" });
});

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "analytics service is healthy." });
});

router.get("/management", async (req, res) => {
  try {
    const scale = req.query.scale || "week";
    const search = req.query.search || "";
    const data = await getManagementData(scale, search);
    res.json(data);
  } catch (error) {
    console.error("management route error:", error);
    res.status(400).json({ message: error.message || "unknown error" });
  }
});

router.get("/product/recommendations", async (req, res) => {
  try {
    const recommendations = getRecommendations(req.query);
    res.status(200).json(recommendations);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get product recommendations");
  }
});

export default router;
