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
  insertShoppingListItem,
  markLoyaltyCouponAsUsed,
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
  updateLoyaltyAccountPoints,
  updateShoppingList,
} from "./db.js";

export class OrdersError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "OrdersError";
    this.statusCode = statusCode || 400;
  }
}

export async function getShoppingList(customerId) {
  return selectShoppingListByCustomerID(customerId);
}

export async function addShoppingListItem(customerId, input) {
  const productId = input.productId;
  const quantity = input.quantity ?? 1;

  if(!Number.isInteger(quantity) || quantity <= 0) {
    // basic check to make sure a valid quantity was provided
    throw new OrdersError("quantity must be a positive integer", 400);
  }

  return insertShoppingListItem(customerId, productId, quantity);
}

export async function updateShoppingListItem(customerId, productId, input) {
  const quantity = input.quantity;
  const checked = input.checked;

  //if(!Number.isInteger(quantity) || quantity <= 0) {
  //  throw new OrdersError("quantity must be a positive integer", 400);
  //}

  const result = await updateShoppingList(customerId, productId, {quantity, checked});

  if (!result) {
    // if there's no result then that item doesn't exist in the shopping list so we can't update
    throw new OrdersError("shopping list item not found", 404);
  }

  return result;
}

function getLoyaltyTier(points) {
  if (points >= 5000) return "Gold";
  if (points >= 2000) return "Silver";
  return "Bronze";
}

// Generate a unique coupon code
function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'LOYALTY-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate coupons when tier upgrades
async function generateUpgradeCoupons(accountId, oldTier, newTier) {
  const benefits = await selectLoyaltyTierBenefits(newTier);
  if (!benefits || benefits.coupon_on_upgrade <= 0) {
    return [];
  }

  const coupons = [];
  const discountPercent = newTier === 'Gold' ? 15 : 10;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

  for (let i = 0; i < benefits.coupon_on_upgrade; i++) {
    const coupon = await insertLoyaltyCoupon(
      accountId,
      generateCouponCode(),
      discountPercent,
      1000, // min £10 spend
      expiresAt
    );
    coupons.push(coupon);
  }

  return coupons;
}

export async function getLoyaltyAccount(customerId) {
  let account = await selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    account = await insertLoyaltyAccount(customerId, getLoyaltyTier(0), 0);
  }

  // Get tier benefits
  const benefits = await selectLoyaltyTierBenefits(account.tier);
  
  const transactions = await selectLoyaltyTransactionsByAccountId(account.id);
  const coupons = await selectLoyaltyCouponsByAccountId(account.id);
  
  return { ...account, benefits, transactions, coupons };
}

export async function getLoyaltyAccountWithPoints(customerId) {
  let account = await selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    account = await insertLoyaltyAccount(customerId, getLoyaltyTier(0), 0);
  }

  // Get tier benefits
  const benefits = await selectLoyaltyTierBenefits(account.tier);
  
  const transactions = await selectLoyaltyTransactionsByAccountId(account.id);
  const unusedCoupons = await selectUnusedLoyaltyCouponsByAccountId(account.id);
  
  return { ...account, benefits, transactions, unusedCoupons };
}

// Calculate points earned from purchase amount
export function calculatePointsFromPurchase(amountPence, tier) {
  const pointsPerPound = {
    'Bronze': 1,
    'Silver': 2,
    'Gold': 3
  };
  const rate = pointsPerPound[tier] || 1;
  return Math.floor((amountPence / 100) * rate);
}

// Calculate discount value from points
export function calculateDiscountFromPoints(points, tier) {
  const redemptionRate = {
    'Bronze': 100,
    'Silver': 100,
    'Gold': 100
  };
  const rate = redemptionRate[tier] || 100;
  return Math.floor(points / rate) * 100; // in pence
}

export async function addLoyaltyPoints(customerId, input) {
  const amount = Number(input.amount);
  const type = input.type || "purchase";
  const orderId = input.orderId || null;

  if (!Number.isInteger(amount) || amount === 0) {
    throw new OrdersError("Point change must be a non-zero integer", 400);
  }

  let account = await selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    account = await insertLoyaltyAccount(customerId, getLoyaltyTier(0), 0);
  }

  const oldTier = account.tier;
  const nextPoints = Math.max(0, account.points + amount);
  const newTier = getLoyaltyTier(nextPoints);
  account = await updateLoyaltyAccountPoints(account.id, nextPoints, newTier);
  const transaction = await insertLoyaltyTransaction(account.id, orderId, type, amount);

  // Check for tier upgrade and generate coupons
  let newCoupons = [];
  if (oldTier !== newTier && newTier !== 'Bronze') {
    newCoupons = await generateUpgradeCoupons(account.id, oldTier, newTier);
  }

  return { ...account, transaction, newCoupons };
}

// Redeem points for discount at checkout
export async function redeemPoints(customerId, pointsToRedeem, orderTotalPence) {
  if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) {
    throw new OrdersError("Points to redeem must be a positive integer", 400);
  }

  let account = await selectLoyaltyAccountByCustomerId(customerId);
  if (!account) {
    throw new OrdersError("Loyalty account not found", 404);
  }

  if (account.points < pointsToRedeem) {
    throw new OrdersError("Insufficient points", 400);
  }

  // Calculate discount
  const discountPence = calculateDiscountFromPoints(pointsToRedeem, account.tier);
  
  // Ensure discount doesn't exceed order total
  const actualDiscount = Math.min(discountPence, orderTotalPence);
  
  // Recalculate points used based on actual discount
  const redemptionRate = {
    'Bronze': 100,
    'Silver': 100,
    'Gold': 100
  };
  const rate = redemptionRate[account.tier] || 100;
  const actualPointsUsed = Math.floor((actualDiscount / 100) * rate);

  const nextPoints = Math.max(0, account.points - actualPointsUsed);
  const newTier = getLoyaltyTier(nextPoints);
  account = await updateLoyaltyAccountPoints(account.id, nextPoints, newTier);
  
  // Record the redemption transaction
  await insertLoyaltyTransaction(account.id, null, "redemption", -actualPointsUsed);

  return {
    pointsRedeemed: actualPointsUsed,
    discountPence: actualDiscount,
    remainingPoints: nextPoints
  };
}

// Apply a coupon to an order
export async function applyCoupon(customerId, couponCode, orderTotalPence) {
  const coupon = await selectLoyaltyCouponByCode(couponCode);
  
  if (!coupon) {
    throw new OrdersError("Invalid coupon code", 404);
  }

  if (coupon.used_at) {
    throw new OrdersError("Coupon has already been used", 400);
  }

  if (new Date(coupon.expires_at) < new Date()) {
    throw new OrdersError("Coupon has expired", 400);
  }

  // Verify the coupon belongs to this customer
  const account = await selectLoyaltyAccountByCustomerId(customerId);
  if (!account || coupon.loyalty_account_id !== account.id) {
    throw new OrdersError("Coupon not found for this account", 404);
  }

  // Check minimum spend
  if (orderTotalPence < coupon.min_spend_pence) {
    throw new OrdersError(`Minimum spend of £${(coupon.min_spend_pence / 100).toFixed(2)} required for this coupon`, 400);
  }

  // Calculate discount
  const discountPence = Math.floor(orderTotalPence * (coupon.discount_percent / 100));

  // Mark coupon as used
  await markLoyaltyCouponAsUsed(coupon.id);

  return {
    couponCode: coupon.code,
    discountPercent: coupon.discount_percent,
    discountPence
  };
}

// Get all tier benefits for display
export async function getAllTierBenefits() {
  return selectAllLoyaltyTierBenefits();
}

// Create a new order with loyalty points integration
export async function createOrder(customerId, items, pointsToRedeem = 0, couponCode = null) {
  if (!items || items.length === 0) {
    throw new OrdersError("Order must have at least one item", 400);
  }

  // Calculate order total
  let totalPence = 0;
  for (const item of items) {
    totalPence += item.price_pence * item.quantity;
  }

  let pointsRedeemed = 0;
  let couponDiscount = 0;

  // Process points redemption if requested
  if (pointsToRedeem > 0) {
    const redemptionResult = await redeemPoints(customerId, pointsToRedeem, totalPence);
    pointsRedeemed = redemptionResult.pointsRedeemed;
    totalPence = Math.max(0, totalPence - redemptionResult.discountPence);
  }

  // Process coupon if provided
  if (couponCode) {
    const couponResult = await applyCoupon(customerId, couponCode, totalPence);
    couponDiscount = couponResult.discountPence;
    totalPence = Math.max(0, totalPence - couponDiscount);
  }

  // Calculate points earned from purchase
  const loyaltyAccount = await selectLoyaltyAccountByCustomerId(customerId);
  const tier = loyaltyAccount ? loyaltyAccount.tier : 'Bronze';
  const pointsEarned = calculatePointsFromPurchase(totalPence, tier);

  // Add loyalty points for the purchase
  if (pointsEarned > 0) {
    await addLoyaltyPoints(customerId, { amount: pointsEarned, type: 'purchase' });
  }

  return {
    customerId,
    items,
    subtotalPence: totalPence + pointsRedeemed + couponDiscount,
    pointsRedeemed,
    couponDiscount,
    totalPence,
    pointsEarned,
    tier
  };
}

export async function removeShoppingListItem(customerId, productId) {
  await deleteShoppingListItem(customerId, productId);
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
  const user = await insertNewCustomer(email, passwordHash, firstName, lastName, phone);
  await insertLoyaltyAccount(user.id, getLoyaltyTier(0), 0);

  return user;
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
    user = await selectStaffByEmail(email);
  }
  else {
    user = await selectCustomerByEmail(email);
  }

  if (!user) {
    throw new OrdersError("Invalid email or password", 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
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
