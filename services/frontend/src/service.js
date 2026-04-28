const BASKET_KEY = "basket";
const SHOPPING_LIST_KEY = "shopping_list_guest";

// Get basket from LocalStorage
export function getBasket() {
  const basket = localStorage.getItem(BASKET_KEY);
  return basket ? JSON.parse(basket) : [];
}

// Save basket to LocalStorage
export function saveBasket(basket) {
  localStorage.setItem(BASKET_KEY, JSON.stringify(basket));
}

// Add item to basket
export function addToBasket(productId, quantity, name, price_pence, image_url) {
  const basket = getBasket();
  const existing = basket.find(i => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    basket.push({ productId, quantity, name, price_pence, image_url });
  }
  saveBasket(basket);
  autoCheck(productId);

  updateHeaderCount();
}

export function updateHeaderCount() {
  const countElement = document.getElementById('basket-count');
  if (countElement) {
    const basket = getBasket();
    const total = basket.reduce((sum, item) => sum + item.quantity, 0);
    countElement.textContent = total;

    if (total === 0) {
      countElement.style.backgroundColor = '#bbbbbb';
      countElement.style.color = '#666';
    } else {
      countElement.style.backgroundColor = '#e63946';
      countElement.style.color = 'white';
    }

    // setting screen reader to read correct number
    countElement.setAttribute('aria-label', `${total} items in basket`);
  }
}
document.addEventListener('DOMContentLoaded', updateHeaderCount);

// Update quantity
export function updateQuantity(productId, quantity) {
  const basket = getBasket();
  const item = basket.find(i => i.productId === productId);
  if (item) {
    item.quantity = quantity;
    saveBasket(basket);
    updateHeaderCount();
  }
}

// Remove item
export function removeFromBasket(productId) {
  let basket = getBasket();
  basket = basket.filter(i => i.productId !== productId);
  saveBasket(basket);
  updateHeaderCount();
}

// Calculate totals
export function calculateTotals() {
  const basket = getBasket();
  const subtotal = basket.reduce((sum, i) => sum + i.price_pence * i.quantity, 0);
  const discounts = 0; // implement later
  const total = subtotal - discounts;
  return { subtotal, discounts, total };
}



// --- Product list logic ---
const PRODUCTS_KEY = "products";

export function cacheProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function getCachedProducts() {
  const data = localStorage.getItem(PRODUCTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function filterProducts(term) {
  const products = getCachedProducts();
  return products.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));
}

export function getProductById(id) {
  const products = getCachedProducts();
  return products.find(p => p.id == id);
}

export function getRecommendations(productId) {
  const products = getCachedProducts();
  return products.filter(p => p.id != productId).slice(0, 4);
}


// --- Shopping list logic ---
function getProductId(item) {
  const productId = Number(item?.product_id ?? item?.productId ?? item?.id);
  return Number.isInteger(productId) && productId > 0 ? productId : null;
}

function getUserId() {
  return document.body.dataset.userId || null;
}

function getGuestList() {
  // return shopping list held in local storage for users who aren't logged in
  const raw = localStorage.getItem(SHOPPING_LIST_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setGuestList(items) {
  // create or update a shopping list in local storage for users who aren't logged in
  localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
}

async function getDatabaseList() {
  // fetch the shopping list from the database for users who are logged in
  const res = await fetch(`/api/shopping-list`);
  if(!res.ok) throw new Error("Failed to load shopping list from the database");
  return res.json();
}

// Methods to choose whether to go for local storage or database storage based on auth state
export async function getShoppingList() {
  if (getUserId()) {
    return getDatabaseList();
  }
  return getGuestList();
}

export async function addShoppingListItem(item) {
  const productId = getProductId(item);
  if (!productId) {
    throw new Error("Product id is missing");
  }

  if (getUserId()) {
    const res = await fetch(`/api/shopping-list/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId,
        quantity: 1,
      }),
    });

    if (!res.ok) throw new Error("Failed to add shopping list item to database");
    return res.json();
  }

  const items = getGuestList();
  const existing = items.find((i) => i.product_id === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({
      product_id: productId,
      name: item.name,
      category_name: item.category_name,
      price_pence: item.price_pence,
      quantity: 1,
      checked: false,
    });
  }
  setGuestList(items);
}

export async function checkShoppingListItem(productId, checked) {
  // mark an item as checked off
  if (getUserId()) {
    const res = await fetch(`/api/shopping-list/items/${productId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checked }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update shopping list item");
    }
    return;
  }

  const items = getGuestList();
  const item = items.find((i) => i.product_id === productId);
  if (item) {
    item.checked = checked;
    setGuestList(items);
  }
}

export async function deleteShoppingListItem(productId) {
  if (getUserId()) {
    await fetch(`/api/shopping-list/items/${productId}`, {
      method: "DELETE",
    });
    return;
  }

  // find all items in local storage that dont match the item we're deleting
  const items = getGuestList().filter((i) => i.product_id !== productId);
  setGuestList(items);
}

export async function autoCheck(productId) {
  try {
    const productIdNumber = Number(productId);
    const items = await getShoppingList();
    const itemExists = items.some((item) => getProductId(item) === productIdNumber);

    if (!itemExists) {
      return;
    }

    await checkShoppingListItem(productId, true);

    window.dispatchEvent(new CustomEvent("shopping-list-updated", {
      detail: { productId, checked: true},
    }));
  } catch (error) {
    console.error("Couldn't automatically check off shopping list item", error);
  }
}

export async function searchProducts(term) {
  if (term.trim().length < 2) {
    return [];
  }
  const res = await fetch(`/api/products/search?q=${encodeURIComponent(term)}`);
  if(!res.ok) {
    throw new Error("Couldn't search products");
  }
  return res.json();
}

export async function reportStockIssue(productId, reporterId, notes = "Marked unavailable by staff") {
  const res = await fetch(`/api/stock-issues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId, reporterId, notes }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to report stock issue");
  }
  return res.json();
}

export async function getUnresolvedStockIssues() {
  const res = await fetch(`/api/stock-issues?status=unresolved`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load issues");
  }
  return res.json();
}

export async function resolveStockIssue(issueId) {
  const res = await fetch(`/api/stock-issues/${issueId}/resolve`, { method: "PATCH" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to resolve stock issue");
  }
  return res.json();
}
