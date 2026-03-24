/**
 * service.js
 * The bridge between the UI and LocalStorage.
 * Handles validation and data integrity.
 */

const BASKET_KEY = "basket";
const PRODUCTS_KEY = "products";

/**
 * INTERNAL VALIDATION
 * Ensures quantity is valid (1-50) and IDs are correct.
 * @throws {Error} if validation fails.
 */
function validateEntry(productId, quantity) {
  if (!productId || isNaN(productId)) {
    throw new Error("Invalid Product ID.");
  }
  const qty = Number(quantity);
  if (isNaN(qty) || qty < 1) {
    throw new Error("Quantity must be at least 1.");
  }
  if (qty > 50) {
    throw new Error("Maximum 50 units per item allowed.");
  }
  return qty;
}

// --- BASKET OPERATIONS ---

export function getBasket() {
  const basket = localStorage.getItem(BASKET_KEY);
  return basket ? JSON.parse(basket) : [];
}

export function saveBasket(basket) {
  localStorage.setItem(BASKET_KEY, JSON.stringify(basket));
}

/**
 * User Story: "Given my basket is empty..."
 * Helper to check if the button should be disabled.
 */
export function isBasketEmpty() {
  return getBasket().length === 0;
}

export function addToBasket(productId, quantity, name, price_pence, image_url) {
  try {
    const validatedQty = validateEntry(productId, quantity);
    const basket = getBasket();
    const existing = basket.find(i => i.productId === productId);

    if (existing) {
      validateEntry(productId, existing.quantity + validatedQty);
      existing.quantity += validatedQty;
    } else {
      basket.push({ productId, quantity: validatedQty, name, price_pence, image_url });
    }

    saveBasket(basket);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export function updateQuantity(productId, quantity) {
  try {
    const validatedQty = validateEntry(productId, quantity);
    const basket = getBasket();
    const item = basket.find(i => i.productId === productId);

    if (item) {
      item.quantity = validatedQty;
      saveBasket(basket);
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export function removeFromBasket(productId) {
  let basket = getBasket();
  basket = basket.filter(i => i.productId !== productId);
  saveBasket(basket);
}

export function clearBasket() {
  localStorage.removeItem(BASKET_KEY);
}

export function calculateTotals() {
  const basket = getBasket();
  const subtotal = basket.reduce((sum, i) => sum + i.price_pence * i.quantity, 0);
  const discounts = 0; 
  const total = subtotal - discounts;
  return { subtotal, discounts, total };
}

// --- PRODUCT CACHING ---

export function cacheProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function getCachedProducts() {
  const data = localStorage.getItem(PRODUCTS_KEY);
  return data ? JSON.parse(data) : [];
}