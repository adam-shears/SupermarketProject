/*
This is solely responsible for handling requests within the frontend.
It should only contain functions that handle requests and return responses.

There should not be any business logic in the frontend service, as this service's
only responsibility is to render the frontend. All business logic should be in the
other services and the frontend should make reqests to those via api.js to get the
data it needs to serve HTML to the user.
*/

import { Router } from "express";
import { api } from "./api.js";

const router = Router();

// Home page
router.get("/", async (req, res) => {
  try {
    const products = await api.listProducts();
    res.render("home.njk", {
      title: "Supermarket",
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
    const [product, products] = await Promise.all([
      api.getProduct(req.params.id),
      api.listProducts(),
    ]);
    const recommendations = products.filter((item) => item.id !== product.id).slice(0, 4);

    res.render("product.njk", {
      title: product.name,
      product,
      recommendations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load product");
  }
});

// Product List Page
router.get("/product-list", async (req, res) => {
  try {
    const products = await api.listProducts();
    res.render("product-list.njk", {
      title: "All Products",
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load product list");
  }
});

// Basket POST endpoint (Client-side usually handles localStorage, but keeping for API compatibility)
router.post("/basket/items", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    console.log(`Adding product ${productId} with quantity ${quantity} to basket`);
    res.status(200).json({ message: "Item added to basket" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add item to basket" });
  }
});

// Basket GET endpoint
router.get("/basket", async (req, res) => {
  try {
    // Note: In your current setup, the basket is managed in LocalStorage by service.js.
    // This route renders the container which then populates itself via client-side JS.
    res.render("basket.njk", {
      title: "Your Basket",
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load basket");
  }
});

// Authentication Routes
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
    res.status(400).render("register.njk", { title: "Register", error: error.message || "Failed to register" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Management View
router.get("/management", async (req, res) => {
  try {
    const allowedScales = ["day", "week", "month"];
    const scale = allowedScales.includes(req.query.scale) ? req.query.scale : "week";
    const management = await api.getManagementView(scale);
    res.render("management.njk", {
      title: "Management View",
      management,
      scale,
    });
  } catch (error) {
    console.error("Management view error:", error);
    res.status(500).send(`Failed to load management view: ${error.message}`);
  }
});

router.get("/management/export.csv", async (req, res) => {
  try {
    const allowedScales = ["day", "week", "month"];
    const scale = allowedScales.includes(req.query.scale) ? req.query.scale : "week";
    const management = await api.getManagementView(scale);

    const lines = [
      "Metric,Value",
      `Time Scale,${scale}`,
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
    res.setHeader("Content-Disposition", `attachment; filename="management-${scale}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).send(`Failed to export CSV: ${error.message}`);
  }
});

// Health check
router.get("/health", async (req, res) => {
  res.status(200).json({ message: "frontend service is healthy." });
});

/**
 * UPDATED: Checkout Page (Guest Enabled)
 * User Story: "Finish quickly... taken to the next step at once."
 */
router.get("/checkout", async (req, res) => {
  try {
    // We pass the user object if logged in, otherwise null. 
    // This allows guest checkout without a forced login redirect.
    res.render("checkout.njk", {
      title: "Checkout - Review Order",
      user: req.session.user || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load checkout page");
  }
});

/**
 * UPDATED: Final Order Confirmation
 * Handles the "Place Order" logic and renders the success state.
 */
router.post("/checkout/confirm", async (req, res) => {
  try {
    // Generate a mock order number for the success page
    const orderId = Math.floor(Math.random() * 900000) + 100000;

    res.render("order-success.njk", { 
      title: "Success!",
      orderId: orderId,
      user: req.session.user || null
    });
  } catch (error) {
    console.error("Confirmation error:", error);
    res.status(500).send("Order failed");
  }
});

export default router;