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

// Home page (optional, can list featured products)
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

// ** Product List Page**
router.get("/product-list", async (req, res) => {
  try {
    const products = await api.listProducts(); // fetch all products
    res.render("product-list.njk", {
      title: "All Products",
      products,
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
      title: "Your Basket",
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

// Health check
router.get("/health", async (req, res) => {
  res.status(200).json({ message: "frontend service is healthy." });
});

export default router;