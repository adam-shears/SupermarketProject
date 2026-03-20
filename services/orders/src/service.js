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
import { insertNewCustomer, selectCustomerByEmail } from "./db.js";

export class OrdersError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "OrdersError";
    this.statusCode = statusCode || 400;
  }
}

export async function registerNewUser(input) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
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
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    createdAt: customer.created_at,
  };
}
