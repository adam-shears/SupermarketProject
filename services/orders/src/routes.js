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
import { logCustomerIn, OrdersError, registerNewUser, createOrder } from "./service.js";

const router = Router();

function sendErrorResponse(res, error, fallbackMessage) {
  if (error instanceof OrdersError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

router.post("/auth/login", async (req, res) => {
  try {
    const user = await logCustomerIn(req.body);
    res.status(200).json(user);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to log in.");
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const user = await registerNewUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to register new user.");
  }
});

router.post("/orders", async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to create order.");
  }
});

router.post("/orders", async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof OrdersError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Create order error:", error);
    res.status(500).json({ message: "Failed to create order." });
  }
});

router.get("/", async (req, res) => {
  res.json({ message: "orders service" });
});

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "orders service is healthy." });
});

export default router;
