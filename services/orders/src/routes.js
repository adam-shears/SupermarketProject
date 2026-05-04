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
  addOrUpdateBasketItem,
  addShoppingListItem,
  clearBasket,
  createOrder,
  deleteCustomerAccount,
  getBasket,
  getBasketTotals,
  getCustomerAccount,
  getCustomerOrderHistory,
  getGuestBasketTotals,
  getGuestCheckoutSnapshot,
  getLoggedInCheckoutSnapshot,
  getSavedBaskets,
  getShoppingList,
  getStaffMembers,
  logCustomerIn,
  OrdersError,
  pushLastOrderToBasket,
  pushSavedBasketToLive,
  registerNewUser,
  removeBasketItem,
  removeShoppingListItem,
  saveBasket,
  updateBasket,
  updateCustomerAccount,
  updateShoppingListItem,
} from "./service.js";

const router = Router();

function sendErrorResponse(res, error, fallbackMessage) {
  if (error instanceof OrdersError) {
    return res.status(error.statusCode).json({ message: error.message, details: error.details || null });
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

/*
  Basket routes
*/
router.get("/customers/:customerId/basket", async (req, res) => {
  try {
    const basket = await getBasket(req.params.customerId);
    res.status(200).json(basket);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get basket.");
  }
});

router.delete("/customers/:customerId/basket", async (req, res) => {
  try {
    await clearBasket(req.params.customerId);
    res.status(204).send();
  } catch (error) {
    sendErrorResponse(res, error, "Failed to clear basket.");
  }
});

router.post("/customers/:customerId/basket/items", async (req, res) => {
  try {
    const item = await addOrUpdateBasketItem(
      req.params.customerId,
      req.body
    );
    res.status(201).json(item);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to add/update basket item.");
  }
});

router.patch("/customers/:customerId/basket/items/:productId", async (req, res) => {
  try {
    const item = await updateBasket(
      req.params.customerId,
      req.params.productId,
      req.body
    );
    res.status(200).json(item);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to update basket item.");
  }
});

router.delete("/customers/:customerId/basket/items/:productId", async (req, res) => {
  try {
    await removeBasketItem(req.params.customerId, req.params.productId);
    res.status(204).send();
  } catch (error) {
    sendErrorResponse(res, error, "Failed to remove basket item.");
  }
});

router.get("/customers/:customerId/baskets/saved", async (req, res) => {
  try {
    const savedBaskets = await getSavedBaskets(req.params.customerId);
    res.status(200).json(savedBaskets);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get saved baskets.");
  }
});

router.post("/customers/:customerId/basket/save", async (req, res) => {
  try {
    const savedBasket = await saveBasket(req.params.customerId, req.body);
    res.status(201).json(savedBasket);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to save basket.");
  }
});

router.post("/customers/:customerId/baskets/:basketId/push", async (req, res) => {
  try {
    await pushSavedBasketToLive(req.params.customerId, req.params.basketId);
    res.status(200).json({ message: "Saved basket pushed to live basket successfully." });
  } catch (error) {
    sendErrorResponse(res, error, "Failed to push saved basket to live basket.");
  }
});

router.post("/customers/:customerId/basket/total", async (req, res) => {
  try {
    const totals = await getBasketTotals(req.params.customerId, req.body.promoCode || null);
    res.status(200).json(totals);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to calculate basket totals.");
  }
});

router.post("/basket/totals", async (req, res) => {
  try {
    const totals = await getGuestBasketTotals(req.body.items, req.body.promoCode || null);
    res.status(200).json(totals);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to calculate guest basket totals.");
  }
});

router.post("/customers/:customerId/checkout/snapshot", async (req, res) => {
  try {
    const snapshot = await getLoggedInCheckoutSnapshot(req.params.customerId, req.body.promoCode || null);
    res.status(200).json(snapshot);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to create checkout snapshot.");
  }
});

router.post("/checkout/snapshot", async (req, res) => {
  try {
    const snapshot = await getGuestCheckoutSnapshot(req.body.items, req.body.promoCode || null);
    res.status(200).json(snapshot);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to create guest checkout snapshot.");
  }
});

router.post("/orders/create", async (req, res) => {
  try {
    const order = await createOrder(req.body.snapshot, req.body.deliveryInfo, req.body.customerId || null, req.body.guestDetails || null);
    res.status(201).json(order);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to create order.");
  }
});

router.post("/customers/:customerId/orders/repeat", async (req, res) => {
  try {
    await pushLastOrderToBasket(req.params.customerId);
    res.status(200).json({ message: "Last order repeated successfully." });
  } catch (error) {
    sendErrorResponse(res, error, "Failed to repeat last order.");
  }
});

export default router;
