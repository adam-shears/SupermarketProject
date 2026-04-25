/*
This file is responsible for implementing actual business logic for the orders service.

If data from the db is required, it should be requested from db.js and processed here.
Responsibilities:
- Validation beyond simple checks at the HTTP layer
- Transforming data
- Enforcing constraints
- Anything else beyond simple HTTP checks or SQL queries

This file should not be responsible for:
- Making SQL queries (db.js)
- Handling HTTP requests and responses (index.js and routes.js)
- Any logic that is not directly related to the business logic of the orders service
*/

import bcrypt from "bcrypt";
import {
  deleteShoppingListItem,
  insertNewCustomer,
  insertShoppingListItem,
  selectCustomerByEmail,
  selectShoppingListByCustomerID,
  selectStaffByEmail,
  updateShoppingList,
  selectOrCreateBasket,
  upsertBasketItem,
  selectBasketWithDetails,
  deleteBasketItem,
  clearBasketItems,
  insertOrder,
  insertOrderItems,
} from "./db.js";

export const ordersDeps = {
  deleteShoppingListItem,
  insertNewCustomer,
  insertShoppingListItem,
  selectCustomerByEmail,
  selectShoppingListByCustomerID,
  selectStaffByEmail,
  updateShoppingList,
  hashPassword: bcrypt.hash,
  comparePassword: bcrypt.compare,
  // basket
  selectOrCreateBasket,
  upsertBasketItem,
  selectBasketWithDetails,
  deleteBasketItem,
  clearBasketItems,
  insertOrder,
  insertOrderItems,
};

export class OrdersError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "OrdersError";
    this.statusCode = statusCode || 400;
  }
}

export async function getShoppingList(customerId) {
  return ordersDeps.selectShoppingListByCustomerID(customerId);
}

export async function addShoppingListItem(customerId, input) {
  const productId = input.productId;
  const quantity = input.quantity ?? 1;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    // basic check to make sure a valid quantity was provided
    throw new OrdersError("quantity must be a positive integer", 400);
  }

  return ordersDeps.insertShoppingListItem(customerId, productId, quantity);
}

export async function updateShoppingListItem(customerId, productId, input) {
  const quantity = input.quantity;
  const checked = input.checked;

  //if(!Number.isInteger(quantity) || quantity <= 0) {
  //  throw new OrdersError("quantity must be a positive integer", 400);
  //}

  const result = await ordersDeps.updateShoppingList(customerId, productId, { quantity, checked });

  if (!result) {
    // if there's no result then that item doesn't exist in the shopping list so we can't update
    throw new OrdersError("shopping list item not found", 404);
  }

  return result;
}

export async function removeShoppingListItem(customerId, productId) {
  await ordersDeps.deleteShoppingListItem(customerId, productId);
}

export async function registerNewUser(input) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const confirmPassword = input.confirmPassword;
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone ? input.phone.trim() : null;

  // basic validation checks
  if (!email) {
    throw new OrdersError("Email is required", 400);
  }

  if (password.length >= 8) {
    let arrayTest =
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[@$!%*?&]/.test(password);
    if (!arrayTest) {
      throw new OrdersError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        400
      );
    }
  } else {
    throw new OrdersError("Password must be at least 8 characters long", 400);
  }

  if (!firstName || !lastName) {
    throw new OrdersError("First name and last name are required", 400);
  }

  if (password !== confirmPassword) {
    throw new OrdersError("Passwords do not match", 400);
  }

  // check if email is already in use
  const existing = await ordersDeps.selectCustomerByEmail(email);
  if (existing) {
    throw new OrdersError("Email is already in use", 409);
  }

  // at this point, the user's input is valid so we can register
  const passwordHash = await ordersDeps.hashPassword(password, 12);

  return ordersDeps.insertNewCustomer(email, passwordHash, firstName, lastName, phone);
}

export async function logCustomerIn(input) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    throw new OrdersError("Email and password are required", 400);
  }

  let user;
  if (email.endsWith("@supermarket.com")) {
    // then user is a staff member and in a different table
    user = await ordersDeps.selectStaffByEmail(email);
  } else {
    user = await ordersDeps.selectCustomerByEmail(email);
  }

  if (!user) {
    throw new OrdersError("Invalid email or password", 401);
  }

  const passwordMatch = await ordersDeps.comparePassword(password, user.password_hash);
  if (!passwordMatch) {
    throw new OrdersError("Invalid email or password", 401);
  }

  // then user is authenticated, return details without the password hash
  return {
    id: user.id,
    admin_level: user.admin_level || 0, // default to 0 if not a staff member
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    createdAt: user.created_at,
  };
}

// ─── Basket service ────────────────────────────────────────────────────────

export async function getBasket(customerId) {
  const basket = await ordersDeps.selectOrCreateBasket(customerId);
  const items = await ordersDeps.selectBasketWithDetails(basket.id);
  return items;
}

export async function addItemToBasket(customerId, input) {
  const productId = input.productId;
  const quantity = input.quantity ?? 1;

  if (!productId) {
    throw new OrdersError("productId is required", 400);
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new OrdersError("quantity must be a positive integer", 400);
  }

  const basket = await ordersDeps.selectOrCreateBasket(customerId);
  const item = await ordersDeps.upsertBasketItem(basket.id, productId, quantity);
  return item;
}

export async function mergeBasket(customerId, items) {
  // Called on login — UPSERT all guest localStorage items into the DB basket
  if (!Array.isArray(items) || items.length === 0) return;

  const basket = await ordersDeps.selectOrCreateBasket(customerId);

  for (const item of items) {
    const productId = item.productId;
    const quantity = item.quantity ?? 1;

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) continue;

    await ordersDeps.upsertBasketItem(basket.id, productId, quantity);
  }
}

export async function removeItemFromBasket(customerId, productId) {
  const basket = await ordersDeps.selectOrCreateBasket(customerId);
  await ordersDeps.deleteBasketItem(basket.id, productId);
}

// ─── Order placement ───────────────────────────────────────────────────────

export async function placeOrder(customerId) {
  const basket = await ordersDeps.selectOrCreateBasket(customerId);
  const items = await ordersDeps.selectBasketWithDetails(basket.id);

  if (items.length === 0) {
    throw new OrdersError("Cannot place an order with an empty basket", 400);
  }

  const subtotalPence = items.reduce((sum, i) => sum + i.price_pence * i.quantity, 0);

  const order = await ordersDeps.insertOrder(customerId, null, null, subtotalPence, subtotalPence);
  await ordersDeps.insertOrderItems(order.id, items);
  await ordersDeps.clearBasketItems(basket.id);

  return { orderId: order.id, totalPence: subtotalPence };
}

export async function placeGuestOrder(input) {
  const { guestEmail, guestName, items } = input;

  if (!guestEmail || !guestName) {
    throw new OrdersError("Name and email are required for guest checkout", 400);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrdersError("Cannot place an order with an empty basket", 400);
  }

  const subtotalPence = items.reduce((sum, i) => sum + i.price_pence * i.quantity, 0);

  const order = await ordersDeps.insertOrder(null, guestEmail, guestName, subtotalPence, subtotalPence);
  await ordersDeps.insertOrderItems(order.id, items);

  return { orderId: order.id, totalPence: subtotalPence };
}
