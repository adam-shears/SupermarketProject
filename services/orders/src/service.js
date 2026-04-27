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
  insertLoyaltyAccount,
  insertLoyaltyCoupon,
  insertLoyaltyTransaction,
  insertNewCustomer,
  insertNewCustomerWithLoyalty,
  insertNewStaff,
  insertShoppingListItem,
  markLoyaltyCouponAsUsed,
  selectAllStaff,
  selectAllLoyaltyTierBenefits,
  selectCustomerByEmail,
  selectLoyaltyAccountByCustomerId,
  selectLoyaltyCouponByCode,
  selectLoyaltyCouponsByAccountId,
  selectLoyaltyTierBenefits,
  selectLoyaltyTransactionsByAccountId,
  selectShoppingListByCustomerID,
  selectStaffByEmail,
  selectUnusedLoyaltyCouponsByAccountId,
  updateShoppingList,
  selectCustomerAccountById,
  updateCustomerAccountById,
  selectCustomerOrdersById,
  softDeleteCustomerById,
  updateLoyaltyAccountPoints,
} from "./db.js";

export const ordersDeps = {
  deleteShoppingListItem,
  insertNewCustomer,
  insertNewCustomerWithLoyalty,
  insertShoppingListItem,
  selectCustomerByEmail,
  selectShoppingListByCustomerID,
  selectStaffByEmail,
  updateShoppingList,
  hashPassword: bcrypt.hash,
  comparePassword: bcrypt.compare,
  insertNewStaff,
  selectAllStaff,
  insertLoyaltyAccount,
  insertLoyaltyCoupon,
  insertLoyaltyTransaction,
  markLoyaltyCouponAsUsed,
  selectAllLoyaltyTierBenefits,
  selectLoyaltyAccountByCustomerId,
  selectLoyaltyCouponByCode,
  selectLoyaltyCouponsByAccountId,
  selectLoyaltyTierBenefits,
  selectLoyaltyTransactionsByAccountId,
  selectUnusedLoyaltyCouponsByAccountId,
  updateLoyaltyAccountPoints,

  // User Space / My Account dependencies
  selectCustomerAccountById,
  updateCustomerAccountById,
  selectCustomerOrdersById,
  softDeleteCustomerById,
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

  // if(!Number.isInteger(quantity) || quantity <= 0) {
  //   throw new OrdersError("quantity must be a positive integer", 400);
  // }

  const result = await ordersDeps.updateShoppingList(customerId, productId, {
    quantity,
    checked,
  });

  if (!result) {
    // if there's no result then that item doesn't exist in the shopping list so we can't update
    throw new OrdersError("shopping list item not found", 404);
  }

  return result;
}

export async function removeShoppingListItem(customerId, productId) {
  await ordersDeps.deleteShoppingListItem(customerId, productId);
}

function getLoyaltyTier(points) {
  if (points >= 5000) return "Gold";
  if (points >= 2000) return "Silver";
  return "Bronze";
}

function generateCouponCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "LOYALTY-";

  for (let i = 0; i < 8; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

async function generateUpgradeCoupons(accountId, newTier) {
  const benefits = await ordersDeps.selectLoyaltyTierBenefits(newTier);
  if (!benefits || benefits.coupon_on_upgrade <= 0) {
    return [];
  }

  const coupons = [];
  const discountPercent = newTier === "Gold" ? 15 : 10;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  for (let i = 0; i < benefits.coupon_on_upgrade; i += 1) {
    const coupon = await ordersDeps.insertLoyaltyCoupon(
      accountId,
      generateCouponCode(),
      discountPercent,
      1000,
      expiresAt
    );
    coupons.push(coupon);
  }

  return coupons;
}

export async function getLoyaltyAccount(customerId) {
  let account = await ordersDeps.selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    account = await ordersDeps.insertLoyaltyAccount(customerId, getLoyaltyTier(0), 0);
  }

  const [benefits, transactions, coupons] = await Promise.all([
    ordersDeps.selectLoyaltyTierBenefits(account.tier),
    ordersDeps.selectLoyaltyTransactionsByAccountId(account.id),
    ordersDeps.selectLoyaltyCouponsByAccountId(account.id),
  ]);

  return { ...account, benefits, transactions, coupons };
}

export async function getLoyaltyAccountWithPoints(customerId) {
  let account = await ordersDeps.selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    account = await ordersDeps.insertLoyaltyAccount(customerId, getLoyaltyTier(0), 0);
  }

  const [benefits, transactions, unusedCoupons] = await Promise.all([
    ordersDeps.selectLoyaltyTierBenefits(account.tier),
    ordersDeps.selectLoyaltyTransactionsByAccountId(account.id),
    ordersDeps.selectUnusedLoyaltyCouponsByAccountId(account.id),
  ]);

  return { ...account, benefits, transactions, unusedCoupons };
}

export function calculatePointsFromPurchase(amountPence, tier) {
  const pointsPerPound = {
    Bronze: 1,
    Silver: 2,
    Gold: 3,
  };
  const rate = pointsPerPound[tier] || 1;
  return Math.floor((amountPence / 100) * rate);
}

export function calculateDiscountFromPoints(points) {
  return Math.floor(points / 100) * 100;
}

export async function addLoyaltyPoints(customerId, input) {
  const amount = Number(input.amount);
  const type = input.type || "purchase";
  const orderId = input.orderId || null;

  if (!Number.isInteger(amount) || amount === 0) {
    throw new OrdersError("Point change must be a non-zero integer", 400);
  }

  let account = await ordersDeps.selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    account = await ordersDeps.insertLoyaltyAccount(customerId, getLoyaltyTier(0), 0);
  }

  const oldTier = account.tier;
  const nextPoints = Math.max(0, account.points + amount);
  const newTier = getLoyaltyTier(nextPoints);
  account = await ordersDeps.updateLoyaltyAccountPoints(account.id, nextPoints, newTier);
  const transaction = await ordersDeps.insertLoyaltyTransaction(account.id, orderId, type, amount);

  const newCoupons =
    oldTier !== newTier && newTier !== "Bronze"
      ? await generateUpgradeCoupons(account.id, newTier)
      : [];

  return { ...account, transaction, newCoupons };
}

export async function redeemPoints(customerId, pointsToRedeem, orderTotalPence) {
  if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) {
    throw new OrdersError("Points to redeem must be a positive integer", 400);
  }

  let account = await ordersDeps.selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    throw new OrdersError("Loyalty account not found", 404);
  }

  if (account.points < pointsToRedeem) {
    throw new OrdersError("Insufficient points", 400);
  }

  const discountPence = calculateDiscountFromPoints(pointsToRedeem);
  const actualDiscount = Math.min(discountPence, Number(orderTotalPence || 0));
  const actualPointsUsed = Math.floor(actualDiscount);
  const nextPoints = Math.max(0, account.points - actualPointsUsed);
  const newTier = getLoyaltyTier(nextPoints);

  account = await ordersDeps.updateLoyaltyAccountPoints(account.id, nextPoints, newTier);
  await ordersDeps.insertLoyaltyTransaction(account.id, null, "redemption", -actualPointsUsed);

  return {
    pointsRedeemed: actualPointsUsed,
    discountPence: actualDiscount,
    remainingPoints: nextPoints,
  };
}

export async function applyCoupon(customerId, couponCode, orderTotalPence) {
  const coupon = await ordersDeps.selectLoyaltyCouponByCode(couponCode);

  if (!coupon) {
    throw new OrdersError("Invalid coupon code", 404);
  }

  if (coupon.used_at) {
    throw new OrdersError("Coupon has already been used", 400);
  }

  if (new Date(coupon.expires_at) < new Date()) {
    throw new OrdersError("Coupon has expired", 400);
  }

  const account = await ordersDeps.selectLoyaltyAccountByCustomerId(customerId);
  if (!account || coupon.loyalty_account_id !== account.id) {
    throw new OrdersError("Coupon not found for this account", 404);
  }

  if (Number(orderTotalPence || 0) < coupon.min_spend_pence) {
    throw new OrdersError(
      `Minimum spend of GBP ${(coupon.min_spend_pence / 100).toFixed(2)} required for this coupon`,
      400
    );
  }

  const discountPence = Math.floor(Number(orderTotalPence || 0) * (coupon.discount_percent / 100));
  await ordersDeps.markLoyaltyCouponAsUsed(coupon.id);

  return {
    couponCode: coupon.code,
    discountPercent: coupon.discount_percent,
    discountPence,
  };
}

export async function getAllTierBenefits() {
  return ordersDeps.selectAllLoyaltyTierBenefits();
}

export async function getStaffMembers() {
  return ordersDeps.selectAllStaff();
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

  if (phone && !/^\d+$/.test(phone)) {
    throw new OrdersError("Phone must contain digits only", 400);
  }

  if (password !== confirmPassword) {
    throw new OrdersError("Passwords do not match", 400);
  }

  // check if email is already in use
  const existing = await ordersDeps.selectCustomerByEmail(email);
  if (existing) {
    throw new OrdersError("Email is already in use", 409);
  }

  if (input.isStaff) {
    // if this is a staff registration, also check the staff table for existing email and make sure it ends with @supermarket.com
    if (!email.endsWith("@supermarket.com")) {
      throw new OrdersError("Staff email must end with @supermarket.com", 400);
    }

    const existingStaff = await ordersDeps.selectStaffByEmail(email);
    if (existingStaff) {
      throw new OrdersError("Email is already in use", 409);
    }

    const adminLevel = input.adminLevel || 1; // default to lowest staff level if not provided
    const passwordHash = await ordersDeps.hashPassword(password, 12);

    return ordersDeps.insertNewStaff(
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      adminLevel
    );
  }

  // if the user is not a staff member, proceed with normal registration unless they try to provide a staff email
  if (email.endsWith("@supermarket.com")) {
    throw new OrdersError(
      "You cannot register with a staff email. If you are a staff member, contact your administrator to register you.",
      403
    );
  }

  // at this point, the user's input is valid so we can register
  const passwordHash = await ordersDeps.hashPassword(password, 12);

  try {
    return await ordersDeps.insertNewCustomerWithLoyalty(
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      getLoyaltyTier(0),
      0
    );
  } catch (error) {
    if (error.code === "23505") {
      throw new OrdersError("Email is already in use", 409);
    }

    if (error.code === "42P01" && error.message?.includes("loyalty_accounts")) {
      throw new OrdersError(
        "Database is missing loyalty tables. Reset the database and restart the app.",
        500
      );
    }

    throw error;
  }
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

  // Extra safety check for soft-deleted customer accounts.
  // selectCustomerByEmail already filters deleted accounts, but this keeps the service safe.
  if (user.deleted_at) {
    throw new OrdersError("Invalid email or password", 401);
  }

  const passwordMatch = await ordersDeps.comparePassword(
    password,
    user.password_hash
  );

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

/*
  User Space / My Account service functions
*/

export async function getCustomerAccount(customerId) {
  const customer = await ordersDeps.selectCustomerAccountById(customerId);

  if (!customer) {
    throw new OrdersError("Customer account not found", 404);
  }

  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    createdAt: customer.created_at,
  };
}

export async function updateCustomerAccount(customerId, input) {
  const firstName = input.firstName ? String(input.firstName).trim() : "";
  const lastName = input.lastName ? String(input.lastName).trim() : "";
  const phone = input.phone ? String(input.phone).trim() : null;

  if (!firstName || !lastName) {
    throw new OrdersError("First name and last name are required", 400);
  }

  const updatedCustomer = await ordersDeps.updateCustomerAccountById(customerId, {
    firstName,
    lastName,
    phone,
  });

  if (!updatedCustomer) {
    throw new OrdersError("Customer account not found", 404);
  }

  return {
    id: updatedCustomer.id,
    email: updatedCustomer.email,
    firstName: updatedCustomer.first_name,
    lastName: updatedCustomer.last_name,
    phone: updatedCustomer.phone,
    createdAt: updatedCustomer.created_at,
  };
}

export async function getCustomerOrderHistory(customerId) {
  const orders = await ordersDeps.selectCustomerOrdersById(customerId);

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    subtotalPence: order.subtotal_pence,
    discountPence: order.discount_pence,
    totalPence: order.total_pence,
    createdAt: order.created_at,
    itemCount: order.item_count,
  }));
}

export async function deleteCustomerAccount(customerId) {
  const deletedCustomer = await ordersDeps.softDeleteCustomerById(customerId);

  if (!deletedCustomer) {
    throw new OrdersError("Customer account not found", 404);
  }

  return {
    id: deletedCustomer.id,
  };
}
