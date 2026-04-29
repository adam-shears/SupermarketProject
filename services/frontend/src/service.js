const BASKET_KEY = "basket";
const GUEST_BASKET_IDS_COOKIE = "guest_basket_ids";
const SHOPPING_LIST_KEY = "shopping_list_guest";

function getUserId() {
  return document.body.dataset.userId || null;
}

// --- Basket logic ---
function parseBasketItem(item) {
  return {
    productId: item.product_id ?? item.productId,
    quantity: item.quantity,
    name: item.name,
    category_name: item.category_name ?? item.categoryName,
    price_pence: item.price_pence ?? item.pricePence,
    image_url: item.image_url || `/images/products/${item.product_id ?? item.productId}.JPG`,
  };
}

function syncGuestBasketIdsCookie(items) {
  // used GPT-5.5 to explain and help with syncing the cookies
  // the recommendations flow is server sided so doesn't have access to local storage
  // GPT-5.5 suggested using a cookie with the product ids
  const ids = [...new Set(items.map((item) => Number(item.productId)).filter(Number.isInteger))];
  document.cookie = `${GUEST_BASKET_IDS_COOKIE}=${encodeURIComponent(ids.join(","))}; path=/; max-age=31536000`; // 1 year
}

function getGuestBasket() {
  const raw = localStorage.getItem(BASKET_KEY);
  return raw ? JSON.parse(raw).map(parseBasketItem) : [];
}

function setGuestBasket(items) {
  localStorage.setItem(BASKET_KEY, JSON.stringify(items));
  syncGuestBasketIdsCookie(items);
}

async function getDatabaseBasket() {
  const res = await fetch("/api/basket");
  if (!res.ok) throw new Error("Failed to load basket from the database");
  return (await res.json()).map(parseBasketItem);
}

export async function getBasket() {
  if (getUserId()) {
    return getDatabaseBasket();
  }
  return getGuestBasket();
}

export async function addToBasket(productId, quantity, name, price_pence, image_url) {
  if (getUserId()) {
    const res = await fetch("/api/basket/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });

    if (!res.ok) throw new Error("Failed to add item to database basket");
    await updateHeaderCount();
    await autoCheck(productId);
    return res.json();
  }

  const basket = getGuestBasket();
  const existing = basket.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    basket.push({ productId, quantity, name, price_pence, image_url });
  }
  setGuestBasket(basket);
  await updateHeaderCount();
  await autoCheck(productId);
}

export async function updateQuantity(productId, quantity) {
  if(getUserId()) {
    const res = await fetch(`/api/basket/items/${productId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity }),
    });

    if (!res.ok) throw new Error("Failed to update item in database basket");
    await updateHeaderCount();
    return res.json();
  }

  const basket = getGuestBasket();
  const item = basket.find((item) => item.productId === productId);

  if (item) {
    item.quantity = quantity;
    setGuestBasket(basket);
    await updateHeaderCount();
  }
}

export async function removeFromBasket(productId) {
  if(getUserId()) {
    await fetch(`/api/basket/items/${productId}`, {
      method: "DELETE",
    });
    await updateHeaderCount();
    return;
  }

  const basket = getGuestBasket();
  const newBasket = basket.filter((item) => item.productId !== productId);
  setGuestBasket(newBasket);
  await updateHeaderCount();
}

export async function updateHeaderCount() {
  const countElement = document.getElementById('basket-count');
  if (countElement) {
    const basket = await getBasket();
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

export async function calculateTotals(promoCode = null) {
  const payload = { promoCode };

  if (!getUserId()) {
    payload.items = getGuestBasket().map(item => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  }

  const res = await fetch("/api/basket/totals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to calculate basket totals");
  return res.json();
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
  if (getUserId()) {
    const res = await fetch(`/api/shopping-list/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: item.id,
        quantity: 1,
      }),
    });

    if (!res.ok) throw new Error("Failed to add shopping list item to database");
    return res.json();
  }

  const items = getGuestList();
  const existing = items.find((i) => i.product_id === item.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({
      product_id: item.id,
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
    await fetch(`/api/shopping-list/items/${productId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checked }),
    });
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
    const items = await getShoppingList();
    const item = items.find((i) => i.product_id === productId);
    if(!item || item.checked) {
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
