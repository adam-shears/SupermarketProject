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

// Basket POST endpoint
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
    res.render("basket.njk", {
      title: "Your Basket",
      user: req.session.user,
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
    res
      .status(400)
      .render("register.njk", { title: "Register", error: error.message || "Failed to register" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    // Render a page that clears client-side data before redirecting
    // Use inline script (not module) to ensure it runs synchronously
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Logging Out...</title></head>
      <body>
        <script>
          // Clear localStorage basket
          localStorage.removeItem('basket');
          localStorage.removeItem('products');
          localStorage.removeItem('synced');

          // Clear sessionStorage sync flag
          sessionStorage.removeItem('synced');

          console.log('✓ Client-side storage cleared');

          // Redirect to home
          window.location.href = '/';
        </script>
      </body>
      </html>
    `);
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
 * Checkout Page (Guest Enabled)
 */
router.get("/checkout", async (req, res) => {
  try {
    res.render("checkout.njk", {
      title: "Checkout - Review Order",
      user: req.session.user || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load checkout page");
  }
});

/**
 * UPDATED: Final Order Confirmation
 * No longer uses a mock ID. Now sends real basket data from the browser to the database.
 */
router.post("/checkout/confirm", async (req, res) => {
  try {
    // 1. Get the basket and email from the submitted form body
    // basket_data is sent as a JSON string from the hidden input in checkout.njk
    const items = JSON.parse(req.body.basket_data);
    const guestEmail = req.body.guest_email || null;

    // 2. Call the orders service to create the DB record
    const orderResponse = await api.createOrder({
      items: items,
      customerId: req.session.user ? req.session.user.id : null,
      guestEmail: guestEmail,
    });

    // 3. Render success with the REAL ID returned from the database
    res.render("order-success.njk", {
      title: "Success!",
      orderId: orderResponse.id,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Confirmation error:", error);
    res.status(500).send("Order failed to save to database. Please try again.");
  }
});

// --- API PROXY ROUTES (for browser JavaScript) ---
// The browser JavaScript imports api.js and calls functions, but needs express to proxy

// GET /api/basket?customerId=X
router.get("/api/basket", async (req, res) => {
  try {
    const customerId = req.query.customerId;
    if (!customerId) return res.status(400).json({ message: "customerId required" });
    const basket = await api.getBasket(customerId);
    res.json(basket);
  } catch (error) {
    console.error("GET /api/basket error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/basket/items
router.post("/api/basket/items", async (req, res) => {
  try {
    console.log('🔵 [/api/basket/items] Received request:', JSON.stringify(req.body));
    const { customerId, productId, quantity } = req.body;
    console.log('  Extracted customerId:', customerId, 'productId:', productId, 'quantity:', quantity);

    if (!customerId) {
      console.error('  ✗ customerId is missing!');
      return res.status(400).json({ message: "customerId required in request body" });
    }

    const result = await api.addToBasket(productId, quantity, customerId);
    console.log('  ✓ Add successful');
    res.json(result);
  } catch (error) {
    console.error("POST /api/basket/items error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/basket/merge
router.post("/api/basket/merge", async (req, res) => {
  try {
    console.log('🔵 [/api/basket/merge] Received request:', JSON.stringify(req.body));
    const { customerId, items } = req.body;
    console.log('  Extracted customerId:', customerId, 'items count:', items?.length);

    if (!customerId) {
      console.error('  ✗ customerId is missing!');
      return res.status(400).json({ message: "customerId required in request body" });
    }

    const result = await api.mergeBasket(customerId, items);
    console.log('  ✓ Merge successful, returned', result?.length, 'items');
    res.json(result);
  } catch (error) {
    console.error("POST /api/basket/merge error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
