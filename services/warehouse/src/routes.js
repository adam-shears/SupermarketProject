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
import { reportStockIssue, listStockIssues, resolveStockIssue, WarehouseError } from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  res.json({ message: "warehouse service" });
});

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "warehouse service is healthy." });
});

// Stock issue endpoints
router.get("/stock-issues", async (req, res) => {
  try {
    const status = req.query.status;
    const issues = await listStockIssues(status);
    res.status(200).json(issues);
  } catch (error) {
    console.error(error);
    if (error instanceof WarehouseError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to get stock issues" });
  }
});

router.post("/stock-issues", async (req, res) => {
  try {
    const { productId, reporterId, notes } = req.body;
    const issue = await reportStockIssue(Number(productId), Number(reporterId), notes);
    res.status(201).json(issue);
  } catch (error) {
    console.error(error);
    if (error instanceof WarehouseError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to create stock issue" });
  }
});

router.patch("/stock-issues/:id/resolve", async (req, res) => {
  try {
    const issue = await resolveStockIssue(Number(req.params.id));
    res.status(200).json(issue);
  } catch (error) {
    console.error(error);
    if (error instanceof WarehouseError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to resolve stock issue" });
  }
});

export default router;
