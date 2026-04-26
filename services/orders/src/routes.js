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
import { addShoppingListItem, addLoyaltyPoints, applyCoupon, calculatePointsFromPurchase, getAllTierBenefits, getLoyaltyAccount, getLoyaltyAccountWithPoints, getShoppingList, logCustomerIn, OrdersError, redeemPoints, registerNewUser, removeShoppingListItem, updateShoppingListItem, createOrder } from "./service.js";

const router = Router();

function sendErrorResponse(res, error, fallbackMessage) {
  if (error instanceof OrdersError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

router.get("/customers/:customerId/shopping-list", async (req, res) => {
  try {
    const items = await getShoppingList(req.params.customerId);
    res.status(200).json(items);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get shopping list.");
  }
});

router.post("/customers/:customerId/shopping-list/items", async (req, res) => {
  try {
    const item = await addShoppingListItem(req.params.customerId, req.body);
    res.status(201).json(item);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to add item to shopping list.");
  }
});

router.get("/customers/:customerId/loyalty", async (req, res) => {
  try {
    const account = await getLoyaltyAccount(req.params.customerId);
    res.status(200).json(account);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get loyalty account.");
  }
});

router.post("/customers/:customerId/loyalty/transactions", async (req, res) => {
  try {
    const transaction = await addLoyaltyPoints(req.params.customerId, req.body);
    res.status(201).json(transaction);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to add loyalty points.");
  }
});

// Get loyalty account with points and unused coupons (for checkout)
router.get("/customers/:customerId/loyalty/checkout", async (req, res) => {
  try {
    const account = await getLoyaltyAccountWithPoints(req.params.customerId);
    res.status(200).json(account);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get loyalty account for checkout.");
  }
});

// Redeem points for discount
router.post("/customers/:customerId/loyalty/redeem", async (req, res) => {
  try {
    const { points, orderTotal } = req.body;
    const result = await redeemPoints(req.params.customerId, points, orderTotal);
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to redeem points.");
  }
});

// Apply a coupon to order
router.post("/customers/:customerId/loyalty/coupon/apply", async (req, res) => {
  try {
    const { couponCode, orderTotal } = req.body;
    const result = await applyCoupon(req.params.customerId, couponCode, orderTotal);
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to apply coupon.");
  }
});

// Get all tier benefits
router.get("/loyalty/tiers", async (req, res) => {
  try {
    const tiers = await getAllTierBenefits();
    res.status(200).json(tiers);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get tier benefits.");
  }
});

// Calculate points from purchase amount
router.get("/loyalty/calculate-points", async (req, res) => {
  try {
    const { amount, tier } = req.query;
    const points = calculatePointsFromPurchase(Number(amount), tier);
    res.status(200).json({ points });
  } catch (error) {
    sendErrorResponse(res, error, "Failed to calculate points.");
  }
});

router.patch("/customers/:customerId/shopping-list/items/:productId", async (req, res) => {
  try {
    const item = await updateShoppingListItem(req.params.customerId, req.params.productId, req.body);
    res.status(200).json(item);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to update item in shopping list.");
  }
});

router.delete("/customers/:customerId/shopping-list/items/:productId", async (req, res) => {
  try {
    await removeShoppingListItem(req.params.customerId, req.params.productId);
    res.status(204).send();
  } catch (error) {
    sendErrorResponse(res, error, "Faield to delete shopping list item.");
  }
});

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

router.get("/", async (req, res) => {
  res.json({ message: "orders service" });
});

// Create a new order with loyalty points integration
router.post("/orders", async (req, res) => {
  try {
    const { customerId, items, pointsToRedeem, couponCode } = req.body;
    const order = await createOrder(customerId, items, pointsToRedeem, couponCode);
    res.status(201).json(order);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to create order.");
  }
});

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "orders service is healthy." });
});

export default router;
