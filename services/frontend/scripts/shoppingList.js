import {
  addShoppingListItem,
  checkShoppingListItem,
  deleteShoppingListItem,
  getShoppingList,
  searchProducts,
} from "/service.js";

const toggle = document.getElementById("shopping-list-toggle");
const closeButton = document.getElementById("shopping-list-close");
const panel = document.getElementById("shopping-list-panel");
const input = document.getElementById("shopping-list-input");
const suggestions = document.getElementById("shopping-list-suggestions");
const list = document.getElementById("shopping-list-items");

toggle.addEventListener("click", () => panel.classList.toggle("hidden"));
closeButton.addEventListener("click", () => panel.classList.add("hidden"));

async function showList() {
  const items = await getShoppingList();
  list.innerHTML = "";

  if (items.length === 0) {
    list.innerHTML = "<p>Your shopping list is empty.</p>";
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "shopping-list-row";
    row.innerHTML =
    `
      <label>
        <input type="checkbox" data-id="${item.product_id}" ${item.checked ? "checked" : ""}>
        <span class="${item.checked ? "checked" : ""}">${item.name}</span>
      </label>
      <button type="button" data-remove="${item.product_id}">Remove</button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", async (event) => {
      await checkShoppingListItem(Number(event.target.dataset.id), event.target.checked);
      await showList();
    });
  });

  list.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      await deleteShoppingListItem(Number(event.target.dataset.remove));
      await showList();
    });
  });
}

function showSuggestions(products) {
  suggestions.innerHTML = "";

  if (products.length === 0) {
    return;
  }

  products.forEach((product) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shopping-list-suggestion";
    button.textContent = `${product.name} - £${(product.price_pence / 100).toFixed(2)}`;

    button.addEventListener("click", async () => {
      await addShoppingListItem(product);
      input.value = "";
      suggestions.innerHTML = "";
      await showList();
    });
    suggestions.appendChild(button);
  });
}

let searchTimeout;
input.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const products = await searchProducts(input.value);
    showSuggestions(products);
  }, 200);
});
showList();
