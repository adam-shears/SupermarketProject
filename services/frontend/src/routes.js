/*
This is solely responsible for handling requests within the frontend.
It should only contain functions that handle requests and return responses.

There should not be any business logic in the frontend service, as this service's
only responsibility is to render the frontend. All business logic should be in the
other services and the frontend should make reqests to those via api.js to get the
data it needs to serve HTML to the user.

The only logic that should be in this file is deciding which HTML to serve and catching
API failures to serve error pages.
*/

import { Router } from "express";
import { api } from "./api.js";

const router = Router();

// function to check if user is logged in for accessing certain endpoints
function requireAuth(requiredAdminLevel) {
  return (req, res, next) => {
    if(!req.session.user) {
      return res.status(401).json({ message: "You must be logged in to access this resource"});
    }
    if ((req.session.user.admin_level || 0) < requiredAdminLevel) {
      return res.status(403).json({ message: "You do not have permission to access this resource"});
    }
    next();
  };
}

// Home page (optional, can list featured products)
router.get("/", async (req, res) => {
  try {
    const products = await api.listProducts();
    res.render("home.njk", {
      title: "Home",
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load products");
  }
});

// Product details page
router.get("/products/:id", async (req, res) => {
  try {
    const from = req.query.from;
    const productId = req.params.id;

    let backlink = "/product-list";
    let backtext = "Back to all products";

    if (from === undefined) {
      backlink = "/product-list?category=All Products";
      backtext = "Back to All Products";
    } else if (from === "basket") {
      backlink = "/basket";
      backtext = "Back to Basket";
    } else if (!isNaN(from)) {
      backlink = `/products/${from}`;
      backtext = "Back to previous product";
    } else {
      backlink = `/product-list?category=${encodeURIComponent(from)}`;
      backtext = `Back to ${from}`;
    }

    const [product, products] = await Promise.all([
      api.getProduct(productId),
      api.listProducts(),
    ]);
    const recommendations = products.filter((item) => item.id !== product.id).slice(0, 4);

    res.render("product.njk", {
      title: product.name,
      product,
      recommendations,
      backlink,
      backtext,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load product");
  }
});

// ** Product List Page**
router.get("/products", async (req, res) => {
  try {
    const category = req.query.category || "";
    const searchTerm = req.query.q ? req.query.q.trim() : "";
    let products, title;

    if(searchTerm) {
      products = await api.searchProducts(searchTerm);
      title = `Results for "${searchTerm}"`;
    } else {
      products = await api.listProducts(); // fetch all products if no search term provided
      title = "All Products";
    }

    if(category) { // filter products by category if it was provided
      products = products.filter((product) => product.category_name.toLowerCase() === category.toLowerCase());
      title += ` in "${category}"`;
    }
    res.render("product-list.njk", {
      title: title,
      category,
      products,
      searchTerm,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load product list");
  }
});

// Basket POST endpoint (temporary)
router.post("/basket/items", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    /*await api.addToBasket(productId, quantity);*/ /* uncomment this when backend orders service is ready */
    console.log(
      `Adding product ${productId} with quantity ${quantity} to basket`
    ); /* temporary log to view post request is working */
    res.status(200).json({ message: "Item added to basket" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add item to basket" });
  }
});

// Basket GET endpoint (temporary hardcoded)
router.get("/basket", async (req, res) => {
  try {
    /*const basket = await api.getBasket();*/ /* uncomment this when backend orders service is ready */

    /* temporary hardcoded basket to view basket page*/
    const basket = {
      items: [
        {
          name: "Cheese",
          price_pence: 299,
          quantity: 1,
          image_url: "https://via.placeholder.com/100",
        },
        {
          name: "Milk",
          price_pence: 150,
          quantity: 2,
          image_url: "https://via.placeholder.com/100",
        },
      ],
      subtotal: 599,
      discounts: 100,
      total: 499,
    };

    res.render("basket.njk", {
      title: "Basket",
      items: basket.items,
      subtotal: basket.subtotal,
      discounts: basket.discounts,
      total: basket.total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load basket");
  }
});

router.get("/login", (req, res) => {
  res.render("login.njk", { title: "Login", error: null });
});

router.post("/login", async (req, res) => {
  try {
    const user = await api.login({ email: req.body.email, password: req.body.password });

    req.session.user = user;
    res.redirect("/");
  } catch (error) {
    res.status(401).render("login.njk", { title: "Login", error: "Invalid email or password" });
  }
});

router.get("/register", (req, res) => {
  res.render("register.njk", { title: "Register", error: null });
});

router.post("/register", async (req, res) => {
  try {
    const user = await api.register({
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirm_password,
      firstName: req.body.first_name,
      lastName: req.body.last_name,
      phone: req.body.phone,
    });

    req.session.user = user;
    res.redirect("/");
  } catch (error) {
    res
      .status(400)
      .render("register.njk", { title: "Register", error: error.message || "Failed to register" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});
//management view
router.get("/management", requireAuth(2), async (req, res) => {
  try {
    const allowedScales = ["day", "week", "month"];
    const scale = allowedScales.includes(req.query.scale) ? req.query.scale : "week";
    const search = req.query.search || "";

    const management = await api.getManagementView(scale, search);

    res.render("management.njk", {
      title: "Management View",
      management,
      scale,
      search,
    });
  } catch (error) {
    console.error("Management view error:", error);
    // Show a friendly error message instead of technical details
    res.render("management.njk", {
      title: "Management View",
      management: { bestSellers: [], salesPerCategory: [], trendingItems: [], totalSalesPence: 0 },
      scale: "week",
      search: "",
      error: "Management data is temporarily unavailable. Please try again later."
    });
  }
});

router.get("/management/export.csv", requireAuth(2), async (req, res) => {
  try {
    const allowedScales = ["day", "week", "month"];
    const scale = allowedScales.includes(req.query.scale) ? req.query.scale : "week";
    const search = req.query.search || "";

    const management = await api.getManagementView(scale, search);

    const lines = [
      "Metric,Value",
      `Time Scale,${scale}`,
      `Search Filter,${search || "none"}`,
      `Total Sales,${(management.totalSalesPence / 100).toFixed(2)}`,
      "",
      "Trending Item,Units Sold",
      ...management.trendingItems.map((item) => `${item.name},${item.unitsSold}`),
      "",
      "Category,Sales",
      ...management.salesPerCategory.map(
        (item) => `${item.category},${(item.salesPence / 100).toFixed(2)}`
      ),
      "",
      "Best Sellers",
      ...management.bestSellers.map((item) => item.name),
    ];

    const csv = lines.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="management-${scale}.csv"`
    );

    res.send(csv);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({ message: "Failed to export CSV. Please try again later." });
  }
});


router.get("/api/products/search", async (req, res) => {
  try {
    const products = await api.searchProducts(req.query.q || "");
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Couldn't search products" });
  }
});

/*
Shopping list endpoints
All of these endpoints require user to be logged in to their account
*/

// GET shopping list items for a logged in user
router.get("/api/shopping-list", requireAuth, async (req, res) => {
  try {
    const items = await api.getShoppingList(req.session.user.id);
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get shopping list" });
  }
});

// Add an item to the shopping list
router.post("/api/shopping-list/items", requireAuth, async (req, res) => {
  try {
    const item = await api.addShoppingListItem(req.session.user.id, req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add item to shopping list" });
  }
});

// Update an item in the shopping list
router.patch("/api/shopping-list/items/:productId", requireAuth, async (req, res) => {
  try {
    const item = await api.updateShoppingListItem(req.session.user.id, req.params.productId, req.body);
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update shopping list item" });
  }
});

// Delete an item from the shopping list
router.delete("/api/shopping-list/items/:productId", requireAuth, async (req, res) => {
  try {
    await api.deleteShoppingListItem(req.session.user.id, req.params.productId);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove item from shopping list"});
  }
});

// Health check
router.get("/health", async (req, res) => {
  res.status(200).json({ message: "frontend service is healthy." });
});

export default router;
