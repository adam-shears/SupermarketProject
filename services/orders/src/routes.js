/*
This file is solely responsible for handling incoming requests to the orders service.
It should only contain definitions for the API endpoints.
All requests should be delegated to service.js for actual handling. Even if the request is simple,
never call db.js directly from here.

The only logic in this file should be handling incoming requests, validating the request itself,
and sending the response.
Actual validation should be done in service.js.
*/

import { Router } from "express";
import {
  addShoppingListItem,
  deleteCustomerAccount,
  getCustomerAccount,
  getCustomerOrderHistory,
  getShoppingList,
  getStaffMembers,
  logCustomerIn,
  OrdersError,
  registerNewUser,
  removeShoppingListItem,
  updateCustomerAccount,
  updateShoppingListItem,
} from "./service.js";

const router = Router();

function sendErrorResponse(res, error, fallbackMessage) {
  if (error instanceof OrdersError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

router.get("/staff", async (req, res) => {
  try {
    const staff = await getStaffMembers();
    res.status(200).json(staff);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get staff members.");
  }
});

/*
  User Space / My Account routes
*/

router.get("/customers/:customerId/account", async (req, res) => {
  try {
    const account = await getCustomerAccount(req.params.customerId);
    res.status(200).json(account);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get customer account.");
  }
});

router.patch("/customers/:customerId/account", async (req, res) => {
  try {
    const account = await updateCustomerAccount(
      req.params.customerId,
      req.body
    );

    res.status(200).json(account);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to update customer account.");
  }
});

router.get("/customers/:customerId/orders", async (req, res) => {
  try {
    const orders = await getCustomerOrderHistory(req.params.customerId);
    res.status(200).json({ orders });
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get customer orders.");
  }
});

router.delete("/customers/:customerId/account", async (req, res) => {
  try {
    const deletedCustomer = await deleteCustomerAccount(req.params.customerId);

    res.status(200).json({
      message: "Account deleted",
      customerId: deletedCustomer.id,
    });
  } catch (error) {
    sendErrorResponse(res, error, "Failed to delete customer account.");
  }
});

/*
  Shopping list routes
*/

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

router.patch(
  "/customers/:customerId/shopping-list/items/:productId",
  async (req, res) => {
    try {
      const item = await updateShoppingListItem(
        req.params.customerId,
        req.params.productId,
        req.body
      );

      res.status(200).json(item);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to update item in shopping list.");
    }
  }
);

router.delete(
  "/customers/:customerId/shopping-list/items/:productId",
  async (req, res) => {
    try {
      await removeShoppingListItem(
        req.params.customerId,
        req.params.productId
      );

      res.status(204).send();
    } catch (error) {
      sendErrorResponse(res, error, "Failed to delete shopping list item.");
    }
  }
);

/*
  Auth routes
*/

router.post("/auth/login", async (req, res) => {
  try {
    const user = await logCustomerIn(req.body);
    res.status(200).json(user);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to log in.");
  }
});

router.post("/auth/register-staff", async (req, res) => {
  try {
    const user = await registerNewUser({ ...req.body, isStaff: true });
    res.status(201).json(user);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to register new staff user.");
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

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "orders service is healthy." });
});

export default router;