const BASKET_KEY = "basket";

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
}

// Update quantity
export function updateQuantity(productId, quantity) {
  const basket = getBasket();
  const item = basket.find(i => i.productId === productId);
  if (item) {
    item.quantity = quantity;
    saveBasket(basket);
  }
}

// Remove item
export function removeFromBasket(productId) {
  let basket = getBasket();
  basket = basket.filter(i => i.productId !== productId);
  saveBasket(basket);
}

// Calculate totals
export function calculateTotals() {
  const basket = getBasket();
  const subtotal = basket.reduce((sum, i) => sum + i.price_pence * i.quantity, 0);
  const discounts = 0; // implement later if needed
  const total = subtotal - discounts;
  return { subtotal, discounts, total };
}