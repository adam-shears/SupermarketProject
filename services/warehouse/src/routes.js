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

router.get("/stock-issues", async (req, res) => {
  try {
    const issues = await service.listStockIssues(req.query.status);
    res.status(200).json(issues);
  } catch (error) {
    console.error(error);
    if (error instanceof service.WarehouseError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to get stock issues" });
  }
});

router.post("/stock-issues", async (req, res) => {
  try {
    const { productId, reporterId, notes } = req.body;
    const issue = await service.reportStockIssue(
      Number(productId),
      Number(reporterId),
      notes
    );
    res.status(201).json(issue);
  } catch (error) {
    console.error(error);
    if (error instanceof service.WarehouseError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to create stock issue" });
  }
});

router.patch("/stock-issues/:id/resolve", async (req, res) => {
  try {
    const issue = await service.resolveStockIssue(Number(req.params.id));
    res.status(200).json(issue);
  } catch (error) {
    console.error(error);
    if (error instanceof service.WarehouseError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to resolve stock issue" });
  }
});

router.get("/picker/orders", async (req, res) => {
  try {
    const orders = await service.getPickerOrders(req.query.pickerId);
    res.status(200).json(orders);
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

router.post("/picker/issues/:issueId/resolve", async (req, res) => {
  try {
    const { issueId } = req.params;
    const result = await service.resolvePickerIssue(issueId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to resolve picker issue:", error);
    res.status(500).json({ message: error.message || "Failed to resolve picker issue" });
  }
});

router.post("/picker/orders/:orderId/finalise", async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await service.finaliseOrder(orderId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to finalise order:", error);
    res.status(500).json({ message: error.message || "Failed to finalise order" });
  }
});

router.get("/inventory", async (req, res) => {
  try {
    const inventory = await service.getInventory();
    res.json(inventory);
  } catch (error) {
    console.error("Failed to load inventory:", error);
    res.status(500).json({ message: error.message || "Failed to load inventory" });
  }
});

router.patch("/inventory/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await service.updateInventory(productId, req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to update inventory:", error);
    res.status(500).json({ message: error.message || "Failed to update inventory" });
  }
});

router.get("/management/issues", async (req, res) => {
  try {
    const issues = await service.getManagementIssues();
    res.status(200).json(issues);
  } catch (error) {
    console.error("Failed to load management issues:", error);
    res.status(500).json({ message: error.message || "Failed to load management issues" });
  }
});

router.get("/management/orders/pending", async (req, res) => {
  try {
    const orders = await service.getPendingOrders();
    res.status(200).json(orders);
  } catch (error) {
    console.error("Failed to load pending orders:", error);
    res.status(500).json({ message: error.message || "Failed to load pending orders" });
  }
});

router.post("/management/orders/:orderId/assign", async (req, res) => {
  try {
    const result = await service.assignPicker(req.params.orderId, req.body.pickerId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to assign picker to order:", error);
    res.status(500).json({ message: error.message || "Failed to assign picker to order" });
  }
});

export default router;
