/**
 * service.js
 * The bridge between the UI and LocalStorage.
 * Handles validation, data integrity, and Server Sync.
 */

const BASKET_KEY = "basket";
const PRODUCTS_KEY = "products";

/**
 * INTERNAL VALIDATION
 * Ensures quantity is valid (1-50) and IDs are correct.
 */
function validateEntry(productId, quantity) {
  if (!productId || isNaN(productId)) throw new Error("Invalid Product ID.");
  const qty = Number(quantity);
  if (isNaN(qty) || qty < 1) throw new Error("Quantity must be at least 1.");
  if (qty > 50) throw new Error("Maximum 50 units per item allowed.");
  return qty;
}

// --- BASKET CORE OPERATIONS ---

export function getBasket() {
  const basket = localStorage.getItem(BASKET_KEY);
  return basket ? JSON.parse(basket) : [];
}

export function saveBasket(basket) {
  localStorage.setItem(BASKET_KEY, JSON.stringify(basket));
}

export function clearBasket() {
  localStorage.removeItem(BASKET_KEY);
}

/**
 * Helper to check if the checkout button should be disabled.
 */
export function isBasketEmpty() {
  return getBasket().length === 0;
}

// --- SYNC LOGIC (The Handshake) ---

/**
 * Loads the user's basket from the database into localStorage.
 * This is the source of truth on page load for logged-in users.
 */
export async function loadBasketFromServer(api, customerId) {
  if (!customerId) {
    console.warn('loadBasketFromServer: No customerId provided');
    return;
  }
  try {
    console.log(`  [loadBasketFromServer] Fetching basket for user ${customerId}...`);
    const basketFromDb = await api.getBasket(customerId);
    console.log(`  [loadBasketFromServer] Received ${basketFromDb.length} items from DB`);
    saveBasket(basketFromDb);
    console.log(`  [loadBasketFromServer] Saved to localStorage`);
  } catch (err) {
    console.error("Failed to load basket from server:", err);
  }
}

/**
 * Takes guest items from localStorage and merges them with the User DB.
 * Call this ONLY on first login. For page loads, use loadBasketFromServer instead.
 */
export async function syncBasketWithServer(api, customerId) {
  const localItems = getBasket();
  console.log(`  [syncBasketWithServer] Merging ${localItems.length} guest items for user ${customerId}`);
  try {
    // Merges guest items into DB and gets the "Official" list back
    const mergedBasket = await api.mergeBasket(customerId, localItems);
    console.log(`  [syncBasketWithServer] Received ${mergedBasket.length} items after merge`);
    saveBasket(mergedBasket);
    sessionStorage.setItem("synced", "true");
  } catch (err) {
    console.error("Basket sync failed:", err);
  }
}

// --- BASKET MUTATIONS ---

/**
 * Adds item to local storage and syncs with DB if user is logged in.
 */
export async function addToBasket(
  productId,
  quantity,
  name,
  price_pence,
  image_url = null,
  user = null,
  api = null
) {
  try {
    const validatedQty = validateEntry(productId, quantity);
    const basket = getBasket();
    const existing = basket.find((i) => i.productId === productId);

    if (existing) {
      existing.quantity += validatedQty;
    } else {
      basket.push({ productId, quantity: validatedQty, name, price_pence, image_url });
    }

    saveBasket(basket);

    // Background update to DB if authenticated
    if (user && user.id && api) {
      await api.addToBasket(productId, validatedQty, user.id);
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Updates quantity for a specific item (e.g., from the Basket Page).
 */
export function updateQuantity(productId, quantity) {
  try {
    const validatedQty = validateEntry(productId, quantity);
    const basket = getBasket();
    const item = basket.find((i) => i.productId === productId);

    if (item) {
      item.quantity = validatedQty;
      saveBasket(basket);
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Removes a specific product from the basket.
 */
export function removeFromBasket(productId) {
  let basket = getBasket();
  basket = basket.filter((i) => i.productId !== productId);
  saveBasket(basket);
}

/**
 * Calculates financial totals for the UI.
 */
export function calculateTotals() {
  const basket = getBasket();
  const subtotal = basket.reduce((sum, i) => sum + i.price_pence * i.quantity, 0);
  const discounts = 0;
  const total = subtotal - discounts;
  return { subtotal, discounts, total };
}

/**
 * Cleans up local data on logout.
 * Clears both localStorage basket and session sync flag.
 */
export function handleUserLogout() {
  clearBasket();
  sessionStorage.removeItem("synced");
  localStorage.removeItem("synced"); // Also clear if stored in localStorage for safety
}

// --- PRODUCT CACHING ---

export function cacheProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function getCachedProducts() {
  const data = localStorage.getItem(PRODUCTS_KEY);
  return data ? JSON.parse(data) : [];
}
