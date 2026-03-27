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
import * as service from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  res.json({ message: "warehouse service" });
});

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "warehouse service is healthy." });
});

router.get("/picker/orders", async (req, res) => {
  try {
    const orders = await service.getPickerOrders();
    res.json(orders);
  } catch (error) {
    console.error("Failed to load picker orders:", error);
    res.status(500).json({ message: error.message || "Failed to load picker orders" });
  }
});

router.post("/picker/orders/:orderId/items/:productId/complete", async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const result = await service.completePickerItem(orderId, productId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to complete picker item:", error);
    res.status(500).json({ message: error.message || "Failed to complete picker item" });
  }
});

router.post("/picker/orders/:orderId/items/:productId/issue", async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { substituteProductId, reason } = req.body;

    const result = await service.reportPickerIssue(orderId, productId, {
      substituteProductId,
      reason,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to report picker issue:", error);
    res.status(500).json({ message: error.message || "Failed to report picker issue" });
  }
});

export default router;