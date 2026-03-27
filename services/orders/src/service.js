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
import { insertNewCustomer, selectCustomerByEmail, insertOrder, insertOrderItem } from "./db.js";

export class OrdersError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "OrdersError";
    this.statusCode = statusCode || 400;
  }
}

/**
 * Handles the business logic for creating a new order.
 * Validates basket contents and calculates totals on the server-side to prevent tampering.
 */
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
      /[!@#$%^&*(),.?":{}|<>]/.test(password);
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
  const existing = await selectCustomerByEmail(email);
  if (existing) {
    throw new OrdersError("Email is already in use", 409);
  }

  // at this point, the user's input is valid so we can register
  const passwordHash = await bcrypt.hash(password, 12);

  return insertNewCustomer(email, passwordHash, firstName, lastName, phone);
}

export async function logCustomerIn(input) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    throw new OrdersError("Email and password are required", 400);
  }

  const customer = await selectCustomerByEmail(email);
  if (!customer) {
    throw new OrdersError("Invalid email or password", 401);
  }

  const passwordMatch = await bcrypt.compare(password, customer.password_hash);
  if (!passwordMatch) {
    throw new OrdersError("Invalid email or password", 401);
  }

  // then user is authenticated, return details without the password hash
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    createdAt: customer.created_at,
  };
}

export async function createOrder(input) {
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) {
    throw new OrdersError("Basket cannot be empty", 400);
  }

  const customerId = input.customerId || null;
  const guestEmail = input.guestEmail ? String(input.guestEmail).trim().toLowerCase() : null;
  const guestName = input.guestName ? String(input.guestName).trim() : null;
  const guestPhone = input.guestPhone ? String(input.guestPhone).trim() : null;

  if (!customerId && !guestEmail) {
    throw new OrdersError("Either customer session or guest email is required", 400);
  }

  let subtotalPence = 0;
  let discountPence = 0;

  const validatedItems = items.map((item) => {
    if (!item.productId || isNaN(Number(item.productId))) {
      throw new OrdersError("Invalid product id", 400);
    }
    const quantity = Number(item.quantity);
    if (!quantity || quantity < 1 || quantity > 999) {
      throw new OrdersError("Invalid item quantity", 400);
    }
    const price = Number(item.price_pence);
    if (isNaN(price) || price < 0) {
      throw new OrdersError("Invalid item price", 400);
    }

    const lineSubtotal = quantity * price;
    const lineDiscount = item.line_discount_pence ? Number(item.line_discount_pence) : 0;
    const lineTotal = lineSubtotal - lineDiscount;

    if (lineTotal < 0) {
      throw new OrdersError("Discounts cannot exceed line total", 400);
    }

    subtotalPence += lineSubtotal;
    discountPence += lineDiscount;

    return {
      productId: Number(item.productId),
      quantity,
      pricePencePerUnit: price,
      lineSubtotalPence: lineSubtotal,
      lineDiscountPence: lineDiscount,
      appliedDiscountId: item.applied_discount_id || null,
      lineTotalPence: lineTotal,
    };
  });

  const totalPence = subtotalPence - discountPence;
  if (totalPence < 0) {
    throw new OrdersError("Total cannot be negative", 400);
  }

  // create the order record
  const orderRecord = await insertOrder(
    customerId,
    guestEmail,
    guestName,
    guestPhone,
    "CREATED",
    subtotalPence,
    discountPence,
    totalPence
  );

  // create each item in order_items
  for (const item of validatedItems) {
    await insertOrderItem(
      orderRecord.id,
      item.productId,
      item.quantity,
      item.pricePencePerUnit,
      item.lineSubtotalPence,
      item.lineDiscountPence,
      item.appliedDiscountId,
      item.lineTotalPence
    );
  }

  return {
    id: orderRecord.id,
    customerId: orderRecord.customer_id,
    guestEmail: orderRecord.guest_email,
    guestName: orderRecord.guest_name,
    guestPhone: orderRecord.guest_phone,
    status: orderRecord.status,
    subtotalPence: orderRecord.subtotal_pence,
    discountPence: orderRecord.discount_pence,
    totalPence: orderRecord.total_pence,
    createdAt: orderRecord.created_at,
    updatedAt: orderRecord.last_updated,
  };
}
