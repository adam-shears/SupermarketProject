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
import { DateTime } from "luxon";
import { api } from "./api.js";

function getFallbackPickerOptions() {
  return [];
}

function getFallbackAssignmentOrders() {
  return [];
}

const router = Router();

// --- Helper Functions ---

// function to convert london timestamps to UTC
// containers run in UTC but user inputs for promos are local time, so we need to convert to UTC before they go to the db
// ideally, this should be more robust and take actual timezone into account, but we're just assuming the staff member is in london for now
function toUTC(londonDateTime) {
  if (!londonDateTime) return null;
  const dt = DateTime.fromFormat(londonDateTime, "yyyy-MM-dd'T'HH:mm", { zone: "Europe/London" });
  return dt.toUTC().toISO();
}

// function to check if user is logged in for accessing certain endpoints
function requireAuth(requiredAdminLevel = 1) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    if ((req.session.user.admin_level || 0) < requiredAdminLevel) {
      return res.status(403).render("4xx.njk", {
        title: "Forbidden",
        status: "403 - Forbidden",
        message: "You do not have permission to access this resource",
        user: req.session.user || null,
      });
    }

    next();
  };
}

// cookie parser
// see comment in service.js function syncGuestBasketIdsCookie() for context on this
function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const match = cookies.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function requireCustomerLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  if ((req.session.user.admin_level || 0) !== 0) {
    return res.status(403).render("4xx.njk", {
      title: "Forbidden",
      status: "403 - Forbidden",
      message: "This page is only available to customer accounts.",
      user: req.session.user || null,
    });
  }

  next();
}

// not implemented pages
router.get(["/loyalty"], (req, res) => {
  res.status(501).render("5xx.njk", {
    title: "Coming Soon",
    status: "501 - Not Implemented",
    message: "This feature is currently under development. Check back soon!",
    user: req.session.user || null,
  });
});

// Home page
router.get("/", async (req, res) => {
  try {
    const products = await api.listProducts();

    res.render("home.njk", {
      title: "Home",
      products,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("5xx.njk", {
      title: "Internal Server Error",
      status: "500 - Internal Server Error",
      message: "Failed to load products",
      user: req.session.user || null,
    });
  }
});

// Staff portal home page
router.get("/staff-portal", requireAuth(1), (req, res) => {
  res.render("staff-portal.njk", {
    title: "Staff Portal",
    user: req.session.user || null,
  });
});

// Product details page
router.get("/products/:id", async (req, res) => {
  try {
    const from = req.query.from || "";
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(404).render("4xx.njk", {
        title: "Product Not Found",
        status: "404 - Not Found",
        message: "The product you are looking for does not exist.",
        user: req.session.user || null,
      });
    }

    let backlink = "/products";
    let backtext = "Back to All Products";

    if (from === "basket") {
      backlink = "/basket";
      backtext = "Back to Basket";
    } else if (from && !Number.isNaN(Number(from))) {
      backlink = `/products/${Number(from)}`;
      backtext = "Back to previous product";
    } else if (from) {
      backlink = `/products?category=${encodeURIComponent(from)}`;
      backtext = `Back to ${from}`;
    }

    const [product, products] = await Promise.all([api.getProduct(productId), api.listProducts()]);

    const customerId = req.session.user ? req.session.user.id : null;
    let productsInBasket = [];
    if (customerId) {
      productsInBasket = await api.getBasket(customerId);
      productsInBasket = productsInBasket.map((item) => Number(item.product_id)).filter(Number.isInteger);
    } else {
      productsInBasket = getCookie(req, "guest_basket_ids").split(",").map(Number).filter(Number.isInteger);
    }

    const recommendedProductIds = await api.getProductRecommendations(productId, {
      customerId,
      productsInBasket,
      limit: req.query.limit || 4,
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const recommendations = recommendedProductIds.map((id) => productMap.get(id)).filter(Boolean);

    res.render("product.njk", {
      title: product.name,
      product,
      recommendations,
      backlink,
      backtext,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error(error);

    if (error.status === 404) {
      return res.status(404).render("4xx.njk", {
        title: "Product Not Found",
        status: "404 - Not Found",
        message: "The product you are looking for does not exist.",
        user: req.session.user || null,
      });
    }

    res.status(500).render("5xx.njk", {
      title: "Internal Server Error",
      status: "500 - Internal Server Error",
      message: "Failed to load product",
      user: req.session.user || null,
    });
  }
});

// Product list page
router.get("/products", async (req, res) => {
  try {
    const category = (req.query.category || "").trim();
    const searchTerm = req.query.q ? req.query.q.trim() : "";

    let products;
    let title;

    if (searchTerm) {
      products = await api.searchProducts(searchTerm);
      title = `Results for "${searchTerm}"`;
    } else {
      products = await api.listProducts();
      title = "All Products";
    }

    if (category) {
      products = products.filter(
        (product) => (product.category_name || "").toLowerCase() === category.toLowerCase()
      );
      title += ` in "${category}"`;
    }

    res.render("product-list.njk", {
      title,
      category,
      products,
      searchTerm,
      encodedCategory: category ? encodeURIComponent(category) : "",
      user: req.session.user || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("5xx.njk", {
      title: "Internal Server Error",
      status: "500 - Internal Server Error",
      message: "Failed to load product list",
      user: req.session.user || null,
    });
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
      title: "Basket",
      user: req.session.user || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("5xx.njk", {
      title: "Internal Server Error",
      status: "500 - Internal Server Error",
      message: "Failed to load basket",
      user: req.session.user || null,
    });
  }
});

router.get("/baskets/saved", requireAuth(0), async (req, res) => {
  try {
    const savedBaskets = await api.getSavedBaskets(req.session.user.id);

    res.render("saved-baskets.njk", {
      title: "Saved Baskets",
      savedBaskets,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("5xx.njk", {
      title: "Internal Server Error",
      status: "500 - Internal Server Error",
      message: "Failed to load saved baskets",
      user: req.session.user || null,
    });
  }
});

router.get("/login", (req, res) => {
  res.render("login.njk", {
    title: "Login",
    error: null,
    user: req.session.user || null,
  });
});

router.post("/login", async (req, res) => {
  try {
    const user = await api.login({
      email: req.body.email,
      password: req.body.password,
    });

    req.session.user = user;

    if (user.admin_level > 0) {
      res.redirect("/staff-portal");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.status(401).render("login.njk", {
      title: "Login",
      error: error.message || "Invalid email or password",
      user: req.session.user || null,
    });
  }
});

router.get("/register", (req, res) => {
  res.render("register.njk", {
    title: "Register",
    error: null,
    user: req.session.user || null,
  });
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
    res.status(400).render("register.njk", {
      title: "Register",
      error: error.message || "Failed to register",
      user: req.session.user || null,
    });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/*
User Space / My Account routes
*/

router.get("/account", requireCustomerLogin, async (req, res) => {
  try {
    const account = await api.getCustomerAccount(req.session.user.id);

    res.render("account.njk", {
      title: "My Account",
      account,
      success: req.query.updated === "1",
      error: null,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Failed to load account page:", error);

    res.status(error.status || 500).render("account.njk", {
      title: "My Account",
      account: req.session.user,
      success: false,
      error: error.message || "Could not load your account details.",
      user: req.session.user || null,
    });
  }
});

router.post("/account/update", requireCustomerLogin, async (req, res) => {
  try {
    const updatedAccount = await api.updateCustomerAccount(req.session.user.id, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
    });

    req.session.user = {
      ...req.session.user,
      first_name: updatedAccount.firstName,
      last_name: updatedAccount.lastName,
      phone: updatedAccount.phone,
    };

    res.redirect("/account?updated=1");
  } catch (error) {
    console.error("Failed to update account:", error);

    res.status(error.status || 400).render("account.njk", {
      title: "My Account",
      account: {
        ...req.session.user,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
      },
      success: false,
      error: error.message || "Could not update your account details.",
      user: req.session.user || null,
    });
  }
});

router.get("/account/orders", requireCustomerLogin, async (req, res) => {
  try {
    const data = await api.getCustomerOrders(req.session.user.id);

    res.render("account-orders.njk", {
      title: "Order History",
      orders: data.orders || [],
      error: null,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Failed to load order history:", error);

    res.status(error.status || 500).render("account-orders.njk", {
      title: "Order History",
      orders: [],
      error: error.message || "Could not load your order history.",
      user: req.session.user || null,
    });
  }
});

router.get("/account/orders/repeat", requireCustomerLogin, async (req, res) => {
  try {
    const data = await api.getCustomerOrders(req.session.user.id);
    res.render("repeat-order.njk", {
      title: "Repeat Last Order",
      order: data.orders[0],
      error: null,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Failed to load repeat order page:", error);
    res.status(error.status || 500).render("5xx.njk", {
      title: "Internal Server Error",
      status: "500 - Internal Server Error",
      message: "Failed to load repeat order page",
      user: req.session.user || null,
    });
  }
});

router.get("/account/delete", requireCustomerLogin, (req, res) => {
  res.render("account-delete.njk", {
    title: "Delete Account",
    error: null,
    user: req.session.user || null,
  });
});

router.post("/account/delete", requireCustomerLogin, async (req, res) => {
  try {
    await api.deleteCustomerAccount(req.session.user.id);

    req.session.destroy(() => {
      res.redirect("/");
    });
  } catch (error) {
    console.error("Failed to delete account:", error);

    res.status(error.status || 500).render("account-delete.njk", {
      title: "Delete Account",
      error: error.message || "Could not delete your account. Please try again.",
      user: req.session.user || null,
    });
  }
});

// Management view
router.get("/management", requireAuth(2), async (req, res) => {
  try {
    const allowedScales = ["day", "week", "month"];
    const scale = allowedScales.includes(req.query.scale) ? req.query.scale : "week";
    const search = req.query.search || "";

    const management = await api.getManagementView(scale, search);

    res.render("management.njk", {
      title: "Sales Analytics",
      management,
      scale,
      search,
      user: req.session.user || null,
      managementActionError: req.query.managementActionError || null,
    });
  } catch (error) {
    console.error("Management view error:", error);
    res.render("management.njk", {
      title: "Management View",
      management: {
        bestSellers: [],
        salesPerCategory: [],
        trendingItems: [],
        totalSalesPence: 0,
        totalSalesDisplay: "0.00",
        orderCount: 0,
        averageOrderValuePence: 0,
        averageOrderValueDisplay: "0.00",
        staff: [],
        ordersToAssign: [],
        promoCodes: [],
        discounts: [],
      },
      scale: "week",
      search: "",
      error: "Management data is temporarily unavailable. Please try again later.",
      user: req.session.user || null,
      pickerOptions: getFallbackPickerOptions(),
      assignmentOrders: getFallbackAssignmentOrders(),
      staffRegisterSuccess: false,
      assignSuccess: false,
      promoSuccess: false,
      discountSuccess: false,
      managementActionError: null,
    });
  }
});

router.get("/manage-promotions", requireAuth(2), async (req, res) => {
  try {
    const allPromotions = await api.getAllPromotions();
    const groupedProducts = await api.chunkProductsByCategory();

    res.render("manage-promotions.njk", {
      title: "Promotions Management",
      groupedProducts: groupedProducts,
      currentPromotions: allPromotions,
      user: req.session.user || null,
      promoSuccess: req.query.promoSuccess === "1",
      discountSuccess: req.query.discountSuccess === "1",
      managementActionError: req.query.managementActionError || null,
    });
  } catch (error) {
    console.error("Failed to load promotions management view:", error);
    res.status(500).render("5xx.njk", {
      title: "Internal Server Error",
      status: "500 - Internal Server Error",
      message: "Failed to load promotions management view",
      user: req.session.user || null,
    });
  }
});

router.get("/staff-management", requireAuth(2), async (req, res) => {
  try {
    const staff = await api.getStaffMembers();
    const assignmentOrders = await api.getPendingOrders();
    const pickerOptions = staff
      .filter((member) => member.admin_level === 1)
      .map((picker) => ({
        value: picker.id,
        label: `${picker.first_name} ${picker.last_name} (${picker.email})`,
      }));

    res.render("staff-management.njk", {
      title: "Staff Management",
      staff,
      pickerOptions,
      assignmentOrders,
      staffRegisterSuccess: req.query.staffRegisterSuccess === "1",
      assignSuccess: req.query.assignSuccess === "1",
      user: req.session.user || null,
      managementActionError: req.query.managementActionError || null,
    });
  } catch (error) {
    console.error("Failed to load staff management view:", error);
    res.status(500).render("5xx.njk", {
      title: "Internal Server Error",
      status: "500 - Internal Server Error",
      message: "Failed to load staff management view",
      user: req.session.user || null,
    });
  }
});

router.post("/management/staff/register", requireAuth(2), async (req, res) => {
  try {
    await api.registerStaffMember({
      firstName: req.body.first_name,
      lastName: req.body.last_name,
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirm_password,
      phone: req.body.phone,
      adminLevel: Number(req.body.admin_level || 1),
    });

    res.redirect("/staff-management?staffRegisterSuccess=1");
  } catch (error) {
    console.error("Staff registration error:", error);
    res.redirect(
      `/staff-management?managementActionError=${encodeURIComponent(
        error.message || "Failed to register staff member."
      )}`
    );
  }
});

router.post("/management/orders/:orderId/assign", requireAuth(2), async (req, res) => {
  try {
    const { orderId } = req.params;
    const pickerId = Number(req.body.picker_id);

    const staff = await api.getStaffMembers();
    const picker = staff.find((member) => member.id === pickerId && member.admin_level === 1);

    if (!picker) {
      throw new Error("Invalid picker selected.");
    }

    await api.assignPickerToOrder(orderId, {
      pickerId,
    });

    res.redirect("/staff-management?assignSuccess=1");
  } catch (error) {
    console.error("Assign picker error:", error);
    res.redirect(
      `/staff-management?managementActionError=${encodeURIComponent(
        error.message || "Failed to assign picker."
      )}`
    );
  }
});

router.post("/management/promotions/promo-codes", requireAuth(2), async (req, res) => {
  try {
    await api.createDeal({
      code: req.body.code,
      name: req.body.name,
      type: req.body.type,
      value: Number(req.body.value),
      startsAt: toUTC(req.body.starts_at),
      endsAt: toUTC(req.body.ends_at),
      products: req.body.products
        ? Array.isArray(req.body.products)
          ? req.body.products
          : [req.body.products]
        : [],
    });

    res.redirect("/manage-promotions?promoSuccess=1");
  } catch (error) {
    console.error("Promo code creation error:", error);
    res.redirect(
      `/manage-promotions?managementActionError=${encodeURIComponent(
        error.message || "Failed to create promo code."
      )}`
    );
  }
});

router.post("/management/promotions/discounts", requireAuth(2), async (req, res) => {
  try {
    await api.createDeal({
      code: req.body.code,
      name: req.body.name,
      type: req.body.type,
      value: Number(req.body.value),
      startsAt: toUTC(req.body.starts_at),
      endsAt: toUTC(req.body.ends_at),
      products: req.body.products
        ? Array.isArray(req.body.products)
          ? req.body.products
          : [req.body.products]
        : [],
    });

    res.redirect("/manage-promotions?discountSuccess=1");
  } catch (error) {
    console.error("Discount creation error:", error);
    res.redirect(
      `/manage-promotions?managementActionError=${encodeURIComponent(
        error.message || "Failed to create discount."
      )}`
    );
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
      `Total Sales,${(Number(management.totalSalesPence || 0) / 100).toFixed(2)}`,
      "",
      "Trending Item,Units Sold",
      ...management.trendingItems.map((item) => `${item.name},${item.unitsSold}`),
      "",
      "Category,Sales",
      ...management.salesPerCategory.map(
        (item) => `${item.category},${(Number(item.salesPence || 0) / 100).toFixed(2)}`
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
*/

router.get("/api/shopping-list", requireAuth(0), async (req, res) => {
  try {
    const items = await api.getShoppingList(req.session.user.id);
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get shopping list" });
  }
});

router.post("/api/shopping-list/items", requireAuth(0), async (req, res) => {
  try {
    const item = await api.addShoppingListItem(req.session.user.id, req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add item to shopping list" });
  }
});

router.patch("/api/shopping-list/items/:productId", requireAuth(0), async (req, res) => {
  try {
    const item = await api.updateShoppingListItem(
      req.session.user.id,
      req.params.productId,
      req.body
    );
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update shopping list item" });
  }
});

router.delete("/api/shopping-list/items/:productId", requireAuth(0), async (req, res) => {
  try {
    await api.deleteShoppingListItem(req.session.user.id, req.params.productId);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove item from shopping list" });
  }
});

/*
Basket endpoints
*/
router.get("/api/basket", requireAuth(0), async (req, res) => {
  try {
    const items = await api.getBasket(req.session.user.id);
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get basket" });
  }
});

router.delete("/api/basket", requireAuth(0), async (req, res) => {
  try {
    await api.clearBasket(req.session.user.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to clear basket" });
  }
});

router.post("/api/basket/items", requireAuth(0), async (req, res) => {
  try {
    const item = await api.addToBasket(req.session.user.id, req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add item to basket" });
  }
});

router.patch("/api/basket/items/:productId", requireAuth(0), async (req, res) => {
  try {
    const item = await api.updateBasketItem(
      req.session.user.id,
      req.params.productId,
      req.body
    );
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update basket item" });
  }
});

router.delete("/api/basket/items/:productId", requireAuth(0), async (req, res) => {
  try {
    await api.deleteBasketItem(req.session.user.id, req.params.productId);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove item from basket" });
  }
});

router.post("/api/basket/save", requireAuth(0), async (req, res) => {
  try {
    const savedBasket = await api.saveBasket(req.session.user.id, req.body);
    res.status(201).json(savedBasket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to save basket" });
  }
});

router.post("/api/basket/push", requireAuth(0), async (req, res) => {
  try {
    await api.pushSavedBasketToLive(req.session.user.id, req.body.basket_id);
    res.status(200).redirect("/basket");
  } catch (error) {
    console.error(error);
    if (error.status >= 500) {
      res.status(error.status).render("5xx.njk", {
        title: "Internal Server Error",
        status: `${error.status} - Internal Server Error`,
        message: `Failed to push saved basket to live basket: ${error.message}`,
        user: req.session.user || null,
      });
    } else {
      res.status(error.status).render("4xx.njk", {
        title: "Error",
        status: `${error.status} - Error`,
        message: `Failed to push saved basket to live basket: ${error.message}`,
        user: req.session.user || null,
      });
    }
  }
});

router.post("/api/basket/totals", async (req, res) => {
  try {
    if (req.session.user) {
      const totals = await api.getBasketTotals(req.session.user.id, req.body);
      res.status(200).json(totals);
    } else {
      const totals = await api.getGuestBasketTotals(req.body);
      res.status(200).json(totals);
    }
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message || "Failed to calculate basket totals" });
  }
});

router.post("/api/orders/repeat", requireAuth(0), async (req, res) => {
  try {
    await api.repeatLastOrder(req.session.user.id);
    res.status(200).redirect("/basket");
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message || "Failed to repeat last order" });
  }
});

// checkout
router.post("/checkout/start", async (req, res) => {
  try {
    let snapshot;
    if (req.session.user) {
      snapshot = await api.createCheckoutSnapshot(req.session.user.id, {promoCode: req.body.promoCode || null});
    } else {
      snapshot = await api.createGuestCheckoutSnapshot({items: req.body.items || [], promoCode: req.body.promoCode || null});
    }
    req.session.checkoutSnapshot = snapshot;
    res.status(201).json({ message: "Checkout started", snapshot });
  } catch (error) {
    console.error("Failed to start checkout:", error);
    res.status(error.status || 500).json({
      message: error.message || "Couldn't start checkout",
      details: error.details || null,
    });
  }
});

router.get("/checkout/delivery", async (req, res) => {
  try {
    if (!req.session.checkoutSnapshot) {
      return res.redirect("/basket");
    }

    res.render("checkout-delivery.njk", {
      title: "Checkout - Delivery Details",
      snapshot: req.session.checkoutSnapshot,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Failed to load delivery details page:", error);
    res.status(500).render("5xx.njk", {
      title: "Internal Server Error",
      status: "500 - Internal Server Error",
      message: `Failed to load delivery details page: ${error.message}`,
      user: req.session.user || null,
    });
  }
});

router.post("/checkout/complete", async (req, res) => {
  try {
    if (!req.session.checkoutSnapshot) {
      return res.redirect("/basket");
    }

    const deliveryInfo = {
      addressLine: req.body.address_line.trim(),
      town: req.body.town.trim(),
      county: req.body.county.trim(),
      postcode: req.body.postcode.trim(),
    };

    if (!deliveryInfo.addressLine || !deliveryInfo.town || !deliveryInfo.county || !deliveryInfo.postcode) {
      throw new Error("All delivery fields are required.");
    }

    let guestDetails;
    if (!req.session.user) {
      guestDetails = {
        name: req.body.name.trim(),
        email: req.body.email.trim(),
        phone: req.body.phone.trim(),
      };
    }

    const result = await api.createOrder({customerId: req.session.user?.id || null, guestDetails, deliveryInfo, snapshot: req.session.checkoutSnapshot});
    delete req.session.checkoutSnapshot;

    let clearBasket;
    if (req.session.user) {
      await api.clearBasket(req.session.user.id);
    } else {
      clearBasket = true;
    }

    res.render("checkout-complete.njk", {
      title: "Checkout Complete",
      order: result,
      user: req.session.user || null,
      clearBasket,
    });
  } catch (error) {
    res.status(error.status || 400).render("checkout-delivery.njk", {
      title: "Checkout - Delivery Details",
      snapshot: req.session.checkoutSnapshot,
      user: req.session.user || null,
      error: error.message || "Couldn't complete checkout.",
    });
  }
});
/*
Picker + stock/location synchronisation routes
*/

router.get("/api/picker/orders", requireAuth(1), async (req, res) => {
  try {
    const orders = await api.getPickerOrders(req.session.user.id);
    res.json(orders);
  } catch (error) {
    console.error("Failed to proxy picker orders:", error);
    res.status(500).json({ message: "Failed to load picker orders" });
  }
});

router.get("/picker", requireAuth(1), async (req, res) => {
  try {
    const orders = await api.getPickerOrders(req.session.user.id);

    res.render("picker.njk", {
      title: "Picker View",
      orders,
      completed: req.query.completed === "1",
      issueSubmitted: req.query.issueSubmitted === "1",
      issueResolved: req.query.issueResolved === "1",
      orderFinalised: req.query.orderFinalised === "1",
      error: req.query.error || null,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Failed to load picker view:", error);
    res.status(500).send(`Failed to load picker view: ${error.message}`);
  }
});

router.post(
  "/picker/orders/:orderId/items/:productId/complete",
  requireAuth(1),
  async (req, res) => {
    try {
      const { orderId, productId } = req.params;
      await api.completePickerItem(orderId, productId);
      res.redirect("/picker?completed=1");
    } catch (error) {
      console.error("Failed to complete picker item:", error);
      res.redirect(`/picker?error=${encodeURIComponent(error.message)}`);
    }
  }
);

router.post("/picker/orders/:orderId/items/:productId/issue", requireAuth(1), async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { substituteProductId, reason } = req.body;

    await api.reportPickerIssue(orderId, productId, {
      substituteProductId: substituteProductId || null,
      reason,
    });

    res.redirect("/picker?issueSubmitted=1");
  } catch (error) {
    console.error("Failed to report picker issue:", error);
    res.redirect(`/picker?error=${encodeURIComponent(error.message)}`);
  }
});

router.post("/picker/issues/:issueId/resolve", requireAuth(1), async (req, res) => {
  try {
    const { issueId } = req.params;
    await api.resolvePickerIssue(issueId);
    res.redirect("/picker?issueResolved=1");
  } catch (error) {
    console.error("Failed to resolve picker issue:", error);
    res.redirect(`/picker?error=${encodeURIComponent(error.message)}`);
  }
});

router.post("/picker/orders/:orderId/finalise", requireAuth(1), async (req, res) => {
  try {
    const { orderId } = req.params;
    await api.finalisePickerOrder(orderId);
    res.redirect("/picker?orderFinalised=1");
  } catch (error) {
    console.error("Failed to finalise order:", error);
    res.redirect(`/picker?error=${encodeURIComponent(error.message)}`);
  }
});

router.get("/inventory", requireAuth(2), async (req, res) => {
  try {
    const [inventory, managementIssues] = await Promise.all([
      api.getInventory(),
      api.getManagementIssues(),
    ]);

    res.render("inventory.njk", {
      title: "Inventory Management",
      inventory,
      managementIssues,
      updated: req.query.updated === "1",
      error: req.query.error || null,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Failed to load inventory view:", error);
    res.status(500).send(`Failed to load inventory view: ${error.message}`);
  }
});

router.post("/inventory/:productId", requireAuth(2), async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, locationCode } = req.body;

    await api.updateInventory(productId, {
      quantity,
      locationCode,
    });

    res.redirect("/inventory?updated=1");
  } catch (error) {
    console.error("Failed to update inventory:", error);
    res.redirect(`/inventory?error=${encodeURIComponent(error.message)}`);
  }
});

// Health check
router.get("/health", async (req, res) => {
  res.status(200).json({ message: "frontend service is healthy." });
});

export default router;
