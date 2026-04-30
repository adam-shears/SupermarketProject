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
  clearActiveBasket,
  copyActiveBasketToSaved,
  copySavedBasketToActive,
  deleteBasketItem,
  deleteShoppingListItem,
  insertLoyaltyAccount,
  insertLoyaltyCoupon,
  insertLoyaltyTransaction,
  insertNewCustomer,
  insertNewCustomerWithLoyalty,
  insertNewStaff,
  insertOrder,
  insertShoppingListItem,
  markLoyaltyCouponAsUsed,
  selectAllLoyaltyTierBenefits,
  reserveStock,
  selectActiveDiscountsForProducts,
  selectAllStaff,
  selectBasketByCustomerId,
  selectBasketPriceLinesByCustomerId,
  selectBasketPriceLinesForGuestBaskets,
  selectCustomerAccountById,
  selectCustomerByEmail,
  selectCustomerOrdersById,
  selectLoyaltyAccountByCustomerId,
  selectLoyaltyCouponByCode,
  selectLoyaltyCouponsByAccountId,
  selectLoyaltyTierBenefits,
  selectLoyaltyTransactionsByAccountId,
  selectSavedBasketsByCustomerId,
  selectShoppingListByCustomerID,
  selectStaffByEmail,
  selectUnusedLoyaltyCouponsByAccountId,
  softDeleteCustomerById,
  updateBasketItem,
  updateCustomerAccountById,
  updateLoyaltyAccountPoints,
  updateShoppingList,
  upsertBasketItem,
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

  // basket deps
  selectBasketByCustomerId,
  upsertBasketItem,
  updateBasketItem,
  deleteBasketItem,
  copyActiveBasketToSaved,
  selectSavedBasketsByCustomerId,
  copySavedBasketToActive,
  selectBasketPriceLinesByCustomerId,
  selectActiveDiscountsForProducts,
  selectBasketPriceLinesForGuestBaskets,
  calculateDiscounts,
  calculateLineTotals,
  insertOrder,
  clearActiveBasket,
  reserveStock,
};

export class OrdersError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = "OrdersError";
    this.statusCode = statusCode || 400;
    this.details = details || null;
  }
}

export async function getBasket(customerId) {
  const basket = await ordersDeps.selectBasketByCustomerId(customerId);

  if (!basket) {
    throw new OrdersError("Basket not found", 404);
  }

  return basket;
}

export async function addOrUpdateBasketItem(customerId, input) {
  const productId = input.productId;
  const quantity = input.quantity ?? 1;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new OrdersError("quantity must be a positive integer", 400);
  }

  return ordersDeps.upsertBasketItem(customerId, productId, quantity);
}

export async function updateBasket(customerId, productId, input) {
  const quantity = input.quantity;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new OrdersError("quantity must be a positive integer", 400);
  }

  const result = await ordersDeps.updateBasketItem(customerId, productId, quantity);
  if (!result) {
    throw new OrdersError("Basket item not found", 404);
  }
  return result;
}

export async function removeBasketItem(customerId, productId) {
  await ordersDeps.deleteBasketItem(customerId, productId);
}

export async function saveBasket(customerId, payload) {
  const name = payload.name || "Saved Basket";
  const savedBasket = await ordersDeps.copyActiveBasketToSaved(customerId, name);

  if (!savedBasket) {
    throw new OrdersError("Can't save an empty basket", 400);
  }

  return savedBasket;
}

export async function getSavedBaskets(customerId) {
  const rows = await ordersDeps.selectSavedBasketsByCustomerId(customerId);
  const basketsToReturn = new Map();

  for (const row of rows) {
    if(!basketsToReturn.has(row.basket_id)) {
      basketsToReturn.set(row.basket_id, {
        id: row.basket_id,
        name: row.basket_name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        item_count: 0,
        total_quantity: 0,
        total_pence: 0,
        items: [],
      });
    }

    const basket = basketsToReturn.get(row.basket_id);
    if (row.product_id) {
      const totalPence = Number(row.quantity) * Number(row.price_pence);
      basket.item_count += 1;
      basket.total_quantity += Number(row.quantity);
      basket.total_pence += totalPence;
      basket.items.push({
        product_id: row.product_id,
        name: row.product_name,
        quantity: row.quantity,
        price_pence: row.price_pence,
        total_pence: totalPence,
      });
    }
  }
  return [...basketsToReturn.values()];
}

export async function pushSavedBasketToLive(customerId, basketId) {
  if(!basketId) {
    throw new OrdersError("basketId is required", 400);
  }

  if (isNaN(Number(basketId))) {
    throw new OrdersError("basketId must be a number", 400);
  }

  basketId = Number(basketId);

  // correct behaviour is completely overwriting the basket with the saved one, so we clear active basket first
  await ordersDeps.clearActiveBasket(customerId);

  const result = await ordersDeps.copySavedBasketToActive(customerId, basketId);

  if (!result) {
    throw new OrdersError("Saved basket not found", 404);
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

function getHighestLoyaltyTier(currentTier, pointsTier) {
  const rank = {
    Bronze: 0,
    Silver: 1,
    Gold: 2,
  };

  return (rank[pointsTier] || 0) > (rank[currentTier] || 0) ? pointsTier : currentTier;
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

export function calculateRedeemablePoints(accountPoints, orderTotalPence) {
  const usablePoints = Math.floor(Number(accountPoints || 0) / 100) * 100;
  const redeemableOrderValue = Math.floor(Number(orderTotalPence || 0) / 100) * 100;

  return Math.max(0, Math.min(usablePoints, redeemableOrderValue));
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
  const newTier = getHighestLoyaltyTier(oldTier, getLoyaltyTier(nextPoints));
  account = await ordersDeps.updateLoyaltyAccountPoints(account.id, nextPoints, newTier);
  const transaction = await ordersDeps.insertLoyaltyTransaction(account.id, orderId, type, amount);

  const newCoupons =
    oldTier !== newTier && newTier !== "Bronze"
      ? await generateUpgradeCoupons(account.id, newTier)
      : [];

  return { ...account, transaction, newCoupons };
}

export async function redeemPoints(customerId, pointsToRedeem, orderTotalPence, orderId = null) {
  let account = await ordersDeps.selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    throw new OrdersError("Loyalty account not found", 404);
  }

  const requestedPoints = Number.isInteger(pointsToRedeem)
    ? Math.floor(pointsToRedeem / 100) * 100
    : calculateRedeemablePoints(account.points, orderTotalPence);

  if (requestedPoints <= 0) {
    throw new OrdersError("At least 100 points are required to redeem", 400);
  }

  if (account.points < requestedPoints) {
    throw new OrdersError("Insufficient points", 400);
  }

  const actualPointsUsed = calculateRedeemablePoints(requestedPoints, orderTotalPence);
  if (actualPointsUsed <= 0) {
    throw new OrdersError("Order total must be at least GBP 1.00 to redeem points", 400);
  }

  const nextPoints = Math.max(0, account.points - actualPointsUsed);
  const newTier = getHighestLoyaltyTier(account.tier, getLoyaltyTier(nextPoints));

  account = await ordersDeps.updateLoyaltyAccountPoints(account.id, nextPoints, newTier);
  await ordersDeps.insertLoyaltyTransaction(account.id, orderId, "redemption", -actualPointsUsed);

  return {
    pointsRedeemed: actualPointsUsed,
    discountPence: actualPointsUsed,
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
  const ordersToReturn = new Map();

  for (const order of orders) {
    if(!ordersToReturn.has(order.id)) {
      ordersToReturn.set(order.id, {
        id: order.id,
        status: order.status,
        subtotalPence: order.subtotal_pence,
        discountPence: order.discount_pence,
        totalPence: order.total_pence,
        lineDiscountPence: 0,
        orderDiscountPence: 0,
        createdAt: order.created_at,
        itemCount: 0,
        items: [],
      });
    }

    const orderToUpdate = ordersToReturn.get(order.id);
    orderToUpdate.itemCount += order.quantity;

    const substituted = order.substituted_product_id ? true : false;
    orderToUpdate.lineDiscountPence += Number(order.line_discount_pence || 0);
    orderToUpdate.orderDiscountPence = Math.max(0, Number(orderToUpdate.discountPence || 0) - orderToUpdate.lineDiscountPence);
    orderToUpdate.items.push({
      productId: order.product_id,
      productName: order.product_name,
      quantity: order.quantity,
      pricePencePerUnit: substituted ? order.substitution_price_pence_per_unit : order.price_pence_per_unit,
      lineSubtotalPence: substituted ? order.substitution_line_subtotal_pence : order.line_subtotal_pence,
      lineDiscountPence: order.line_discount_pence,
      lineTotalPence: substituted ? order.substitution_line_total_pence : order.line_total_pence,
      substituted,
      substitutedProductId: order.substituted_product_id,
      substitutedProductName: order.substituted_product_name,
      originalPricePencePerUnit: order.price_pence_per_unit,
      originalLineTotalPence: order.line_total_pence,
    });
  }
  return Array.from(ordersToReturn.values());
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

export function calculateDiscounts(line, discount) {
  const pricePence = line.price_pence;

  if(discount.type === "percentage") {
    return Math.round(pricePence * (discount.value / 100) * line.quantity);
  } else if (discount.type === "fixed") {
    return Math.min(discount.value, pricePence) * line.quantity;
  }

  // then discount isnt valid
  return 0;
}

export function calculateLineTotals(lines, discounts, promoCode = null) {
  const discountsByProduct = new Map();

  for (const discount of discounts) {
    if (!discountsByProduct.has(discount.product_id)) {
      discountsByProduct.set(discount.product_id, []);
    }
    discountsByProduct.get(discount.product_id).push(discount);
  }

  let subtotal = 0;
  let discountTotal = 0;
  let promoApplied = false;

  for (const line of lines) {
    const lineSubtotal = line.price_pence * line.quantity;
    subtotal += lineSubtotal;

    const lineDiscounts = discountsByProduct.get(line.product_id) || [];
    for (const discount of lineDiscounts) {
      if (discount.code) {
        const result = ordersDeps.calculateDiscounts(line, discount);
        if (result > 0) promoApplied = true;
        discountTotal += result;
      } else {
        discountTotal += ordersDeps.calculateDiscounts(line, discount);
      }
    }
  }

  if (promoCode && !promoApplied) {
    throw new OrdersError(`Promo code ${promoCode} is not valid for any items in the basket`, 400);
  }

  return {
    subtotal,
    discounts: discountTotal,
    total: Math.max(0, subtotal - discountTotal),
    promoApplied,
  };
}

export async function getBasketTotals(customerId, promoCode = null) {
  const lines = await ordersDeps.selectBasketPriceLinesByCustomerId(customerId);
  const productIds = lines.map(line => line.product_id);
  const discounts = await ordersDeps.selectActiveDiscountsForProducts(productIds, promoCode);
  return ordersDeps.calculateLineTotals(lines, discounts, promoCode);
}

export async function getGuestBasketTotals(items, promoCode = null) {
  const parsed = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));

  const lines = await ordersDeps.selectBasketPriceLinesForGuestBaskets(parsed);
  const productIds = lines.map(line => line.product_id);
  const discounts = await ordersDeps.selectActiveDiscountsForProducts(productIds, promoCode);
  return ordersDeps.calculateLineTotals(lines, discounts, promoCode);
}

function getCheckoutSnapshot(lines, discounts, promoCode = null) {
  const discountsByProduct = new Map();

  for (const discount of discounts) {
    if (!discountsByProduct.has(discount.product_id)) {
      discountsByProduct.set(discount.product_id, []);
    }
    discountsByProduct.get(discount.product_id).push(discount);
  }

  let subtotalPence = 0;
  let discountPence = 0;
  let promoApplied = false;

  const items = lines.map((line) => {
    const lineSubtotalPence = line.price_pence * line.quantity;
    const lineDiscounts = discountsByProduct.get(line.product_id) || [];

    let lineDiscountPence = 0;
    let appliedDiscountId = null;

    for (const discount of lineDiscounts) {
      const result = ordersDeps.calculateDiscounts(line, discount);

      if (result > 0) {
        lineDiscountPence += result;
        appliedDiscountId = discount.id;
        if (discount.code) {
          promoApplied = true;
        }
      }
    }

    lineDiscountPence = Math.min(lineDiscountPence, lineSubtotalPence);

    subtotalPence += lineSubtotalPence;
    discountPence += lineDiscountPence;

    return {
      product_id: line.product_id,
      name: line.name,
      quantity: line.quantity,
      price_pence_per_unit: line.price_pence,
      line_subtotal_pence: lineSubtotalPence,
      line_discount_pence: lineDiscountPence,
      applied_discount_id: appliedDiscountId,
      line_total_pence: lineSubtotalPence - lineDiscountPence,
    };
  });

  if (promoCode && !promoApplied) {
    throw new OrdersError(`Promo code ${promoCode} is not valid for any items in the basket`, 400);
  }

  if (items.length === 0) {
    throw new OrdersError("Cannot checkout with an empty basket", 400);
  }

  return {
    subtotalPence,
    discountPence,
    totalPence: Math.max(0, subtotalPence - discountPence),
    promoApplied,
    items,
  };
}

export async function getLoggedInCheckoutSnapshot(customerId, promoCode = null, options = {}) {
  const lines = await ordersDeps.selectBasketPriceLinesByCustomerId(customerId);
  const productIds = lines.map(line => line.product_id);
  const discounts = await ordersDeps.selectActiveDiscountsForProducts(productIds, promoCode);
  const snapshot = await addCheckoutLoyaltyDiscounts(
    getCheckoutSnapshot(lines, discounts, promoCode),
    customerId,
    options
  );

  const reservation = await ordersDeps.reserveStock(snapshot.items);
  if (!reservation.reserved) {
    throw new OrdersError("Items are unavailable", 409, { unavailable: reservation.unavailableItems });
  }

  return snapshot;
}

export async function getGuestCheckoutSnapshot(items, promoCode = null) {
  const parsed = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));

  const lines = await ordersDeps.selectBasketPriceLinesForGuestBaskets(parsed);
  const productIds = lines.map(line => line.product_id);
  const discounts = await ordersDeps.selectActiveDiscountsForProducts(productIds, promoCode);
  const snapshot = getCheckoutSnapshot(lines, discounts, promoCode);

  const reservation = await ordersDeps.reserveStock(snapshot.items);
  if (!reservation.reserved) {
    throw new OrdersError("Items are unavailable", 409, { unavailable: reservation.unavailableItems });
  }

  return { ...snapshot, orderDiscounts: [] };
}

export async function createOrder(snapshot, deliveryInfo, customerId = null, guestDetails = null) {
  const orderId = await ordersDeps.insertOrder(
    customerId,
    guestDetails,
    "pending",
    snapshot.subtotalPence,
    snapshot.discountPence,
    snapshot.totalPence,
    deliveryInfo,
    snapshot.items
  );

  if (customerId) {
    for (const discount of snapshot.orderDiscounts || []) {
      if (discount.type === "loyalty_coupon") {
        await applyCoupon(customerId, discount.couponCode, discount.orderTotalPence);
      }

      if (discount.type === "loyalty_points") {
        await redeemPoints(
          customerId,
          discount.pointsRedeemed,
          discount.orderTotalPence,
          orderId
        );
      }
    }

    const account = await ordersDeps.selectLoyaltyAccountByCustomerId(customerId);
    const purchasePoints = calculatePointsFromPurchase(snapshot.totalPence, account?.tier || "Bronze");

    if (purchasePoints > 0) {
      await addLoyaltyPoints(customerId, {
        amount: purchasePoints,
        type: "purchase",
        orderId,
      });
    }
  }

  return orderId;
}

function getCouponDiscount(coupon, orderTotalPence) {
  if (!coupon || Number(orderTotalPence || 0) < Number(coupon.min_spend_pence || 0)) {
    return 0;
  }

  return Math.floor(Number(orderTotalPence || 0) * (Number(coupon.discount_percent || 0) / 100));
}

function getBestEligibleCoupon(coupons, orderTotalPence) {
  let coupon = null;
  let discountPence = 0;

  for (const item of coupons || []) {
    const itemDiscount = getCouponDiscount(item, orderTotalPence);
    if (itemDiscount > discountPence) {
      coupon = item;
      discountPence = itemDiscount;
    }
  }

  return { coupon, discountPence };
}

async function getOrCreateLoyaltyAccount(customerId) {
  let account = await ordersDeps.selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    account = await ordersDeps.insertLoyaltyAccount(customerId, getLoyaltyTier(0), 0);
  }

  return account;
}

async function addCheckoutLoyaltyDiscounts(snapshot, customerId, options = {}) {
  if (!customerId || (!options.useLoyaltyCoupon && !options.useLoyaltyPoints)) {
    return { ...snapshot, orderDiscounts: snapshot.orderDiscounts || [] };
  }

  const account = await getOrCreateLoyaltyAccount(customerId);
  const orderDiscounts = [];
  let totalPence = Number(snapshot.totalPence || 0);

  if (options.useLoyaltyCoupon) {
    const coupons = await ordersDeps.selectUnusedLoyaltyCouponsByAccountId(account.id);
    const { coupon, discountPence } = getBestEligibleCoupon(coupons, totalPence);

    if (!coupon || discountPence <= 0) {
      throw new OrdersError("No eligible loyalty coupon is available for this order", 400);
    }

    orderDiscounts.push({
      type: "loyalty_coupon",
      label: `Loyalty coupon ${coupon.code}`,
      couponCode: coupon.code,
      couponId: coupon.id,
      discountPercent: coupon.discount_percent,
      orderTotalPence: totalPence,
      discountPence,
    });
    totalPence = Math.max(0, totalPence - discountPence);
  }

  if (options.useLoyaltyPoints) {
    const pointsRedeemed = calculateRedeemablePoints(account.points, totalPence);

    if (pointsRedeemed <= 0) {
      throw new OrdersError("At least 100 points are required to redeem", 400);
    }

    orderDiscounts.push({
      type: "loyalty_points",
      label: "Loyalty points",
      pointsRedeemed,
      orderTotalPence: totalPence,
      discountPence: pointsRedeemed,
    });
    totalPence = Math.max(0, totalPence - pointsRedeemed);
  }

  const orderDiscountPence = orderDiscounts.reduce((sum, discount) => sum + discount.discountPence, 0);

  return {
    ...snapshot,
    discountPence: snapshot.discountPence + orderDiscountPence,
    totalPence,
    orderDiscounts,
  };
}

export async function clearBasket(customerId) {
  return ordersDeps.clearActiveBasket(customerId);
}
