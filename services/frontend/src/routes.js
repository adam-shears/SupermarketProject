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

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "frontend service is healthy." });
});

export default router;
