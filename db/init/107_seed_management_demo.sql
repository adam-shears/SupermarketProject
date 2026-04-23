-- 103_seed_management_demo.sql
-- Demo / mock management analytics data used for final project demonstration.
-- This data is intentionally seeded for showcasing the Management View
-- (day / week / month) and is not intended to represent live production analytics.

DROP TABLE IF EXISTS management_demo_data;

CREATE TABLE management_demo_data (
  scale TEXT PRIMARY KEY CHECK (scale IN ('day', 'week', 'month')),
  payload JSONB NOT NULL
);

INSERT INTO management_demo_data (scale, payload) VALUES
(
  'day',
  '{
    "totalSalesPence": 97840,
    "totalSalesDisplay": "978.40",
    "orderCount": 27,
    "averageOrderValuePence": 3624,
    "averageOrderValueDisplay": "36.24",
    "bestSellers": [
      { "id": 1, "name": "Tesco British Strawberries 400g" },
      { "id": 2, "name": "Tesco Bakery Butter Croissants 4 pack" },
      { "id": 3, "name": "Walkers Ready Salted Crisps 6 pack" },
      { "id": 4, "name": "Alpro Oat Drink 1L" },
      { "id": 5, "name": "Haagen Dazs Vanilla 460ml" },
      { "id": 6, "name": "Ariel All in One Pods 24 pack" },
      { "id": 7, "name": "Andrex Gentle Clean Toilet Tissue 9 rolls" },
      { "id": 8, "name": "Coca Cola Zero Sugar 8 x 330ml" }
    ],
    "salesPerCategory": [
      { "category": "Fresh Food", "salesPence": 22640 },
      { "category": "Bakery", "salesPence": 12980 },
      { "category": "Frozen Food", "salesPence": 11120 },
      { "category": "Treats & Snacks", "salesPence": 15860 },
      { "category": "Drinks", "salesPence": 12040 },
      { "category": "Groceries & Essentials", "salesPence": 7100 },
      { "category": "Household & Cleaning", "salesPence": 8900 },
      { "category": "Health & Beauty", "salesPence": 3350 },
      { "category": "Baby & Toddler", "salesPence": 1050 },
      { "category": "Pets", "salesPence": 800 }
    ],
    "trendingItems": [
      { "rank": 1, "name": "Tesco British Strawberries 400g", "unitsSold": 19 },
      { "rank": 2, "name": "Walkers Ready Salted Crisps 6 pack", "unitsSold": 16 },
      { "rank": 3, "name": "Tesco Bakery Butter Croissants 4 pack", "unitsSold": 14 },
      { "rank": 4, "name": "Alpro Oat Drink 1L", "unitsSold": 12 },
      { "rank": 5, "name": "Haagen Dazs Vanilla 460ml", "unitsSold": 10 },
      { "rank": 6, "name": "Coca Cola Zero Sugar 8 x 330ml", "unitsSold": 9 },
      { "rank": 7, "name": "Ariel All in One Pods 24 pack", "unitsSold": 7 },
      { "rank": 8, "name": "Andrex Gentle Clean Toilet Tissue 9 rolls", "unitsSold": 6 }
    ],
    "staff": [
      { "name": "Alice Brown", "role": "Manager", "status": "Active", "assignedOrders": 0 },
      { "name": "Ben Smith", "role": "Picker", "status": "Active", "assignedOrders": 5 },
      { "name": "Chloe Green", "role": "Picker", "status": "On Shift", "assignedOrders": 4 },
      { "name": "Daniel Reed", "role": "Picker", "status": "Active", "assignedOrders": 3 },
      { "name": "Ella Stone", "role": "Picker", "status": "Active", "assignedOrders": 2 },
      { "name": "Grace Hall", "role": "Support", "status": "Active", "assignedOrders": 0 }
    ],
    "ordersToAssign": [
      { "id": 1201, "customer": "Emma Taylor", "status": "Pending", "picker": "Unassigned" },
      { "id": 1202, "customer": "Daniel White", "status": "Picking", "picker": "Ben Smith" },
      { "id": 1203, "customer": "Sophie Hall", "status": "Pending", "picker": "Unassigned" },
      { "id": 1204, "customer": "Luca Martin", "status": "Pending", "picker": "Chloe Green" },
      { "id": 1205, "customer": "Mia Jones", "status": "Pending", "picker": "Unassigned" },
      { "id": 1206, "customer": "Oliver Reed", "status": "Picking", "picker": "Daniel Reed" },
      { "id": 1207, "customer": "Ava Morgan", "status": "Pending", "picker": "Ella Stone" },
      { "id": 1208, "customer": "Leo Walker", "status": "Pending", "picker": "Unassigned" }
    ],
    "promoCodes": [
      { "code": "SAVE10", "description": "10% off orders over £30", "discount": "10%", "status": "Active", "expiry": "2026-05-31" },
      { "code": "FRESH5", "description": "£5 off selected fresh food", "discount": "£5", "status": "Active", "expiry": "2026-06-08" },
      { "code": "SNACK15", "description": "15% off treats and snacks", "discount": "15%", "status": "Inactive", "expiry": "2026-05-02" },
      { "code": "DRINK8", "description": "8% off selected drinks", "discount": "8%", "status": "Active", "expiry": "2026-06-11" },
      { "code": "HOME10", "description": "10% off household and cleaning", "discount": "10%", "status": "Active", "expiry": "2026-06-15" }
    ],
    "discounts": [
      { "product": "Tesco British Strawberries 400g", "category": "Fresh Food", "oldPricePence": 764, "newPricePence": 650, "status": "Active" },
      { "product": "Tesco Bakery Butter Croissants 4 pack", "category": "Bakery", "oldPricePence": 326, "newPricePence": 280, "status": "Active" },
      { "product": "Walkers Ready Salted Crisps 6 pack", "category": "Treats & Snacks", "oldPricePence": 216, "newPricePence": 180, "status": "Active" },
      { "product": "Haagen Dazs Vanilla 460ml", "category": "Frozen Food", "oldPricePence": 894, "newPricePence": 760, "status": "Active" },
      { "product": "Alpro Oat Drink 1L", "category": "Drinks", "oldPricePence": 974, "newPricePence": 850, "status": "Active" },
      { "product": "Ariel All in One Pods 24 pack", "category": "Household & Cleaning", "oldPricePence": 1341, "newPricePence": 1199, "status": "Active" }
    ]
  }'::jsonb
),
(
  'week',
  '{
    "totalSalesPence": 564920,
    "totalSalesDisplay": "5,649.20",
    "orderCount": 148,
    "averageOrderValuePence": 3817,
    "averageOrderValueDisplay": "38.17",
    "bestSellers": [
      { "id": 1, "name": "Walkers Ready Salted Crisps 6 pack" },
      { "id": 2, "name": "Tesco British Strawberries 400g" },
      { "id": 3, "name": "Tesco Bakery Butter Croissants 4 pack" },
      { "id": 4, "name": "Alpro Oat Drink 1L" },
      { "id": 5, "name": "Haagen Dazs Vanilla 460ml" },
      { "id": 6, "name": "Ariel All in One Pods 24 pack" },
      { "id": 7, "name": "Andrex Gentle Clean Toilet Tissue 9 rolls" },
      { "id": 8, "name": "Coca Cola Zero Sugar 8 x 330ml" },
      { "id": 9, "name": "Cathedral City Mature Cheddar 350g" },
      { "id": 10, "name": "Tesco Free Range Large Eggs 12 pack" }
    ],
    "salesPerCategory": [
      { "category": "Fresh Food", "salesPence": 126400 },
      { "category": "Bakery", "salesPence": 73400 },
      { "category": "Frozen Food", "salesPence": 64800 },
      { "category": "Treats & Snacks", "salesPence": 85100 },
      { "category": "Drinks", "salesPence": 67200 },
      { "category": "Groceries & Essentials", "salesPence": 49600 },
      { "category": "Household & Cleaning", "salesPence": 55400 },
      { "category": "Health & Beauty", "salesPence": 18820 },
      { "category": "Baby & Toddler", "salesPence": 10600 },
      { "category": "Pets", "salesPence": 13600 }
    ],
    "trendingItems": [
      { "rank": 1, "name": "Walkers Ready Salted Crisps 6 pack", "unitsSold": 76 },
      { "rank": 2, "name": "Tesco British Strawberries 400g", "unitsSold": 63 },
      { "rank": 3, "name": "Alpro Oat Drink 1L", "unitsSold": 49 },
      { "rank": 4, "name": "Tesco Bakery Butter Croissants 4 pack", "unitsSold": 46 },
      { "rank": 5, "name": "Haagen Dazs Vanilla 460ml", "unitsSold": 40 },
      { "rank": 6, "name": "Coca Cola Zero Sugar 8 x 330ml", "unitsSold": 37 },
      { "rank": 7, "name": "Andrex Gentle Clean Toilet Tissue 9 rolls", "unitsSold": 31 },
      { "rank": 8, "name": "Tesco Free Range Large Eggs 12 pack", "unitsSold": 29 },
      { "rank": 9, "name": "Cathedral City Mature Cheddar 350g", "unitsSold": 27 },
      { "rank": 10, "name": "Ariel All in One Pods 24 pack", "unitsSold": 24 }
    ],
    "staff": [
      { "name": "Alice Brown", "role": "Manager", "status": "Active", "assignedOrders": 0 },
      { "name": "Ben Smith", "role": "Picker", "status": "Active", "assignedOrders": 16 },
      { "name": "Chloe Green", "role": "Picker", "status": "Active", "assignedOrders": 13 },
      { "name": "Daniel Reed", "role": "Picker", "status": "Active", "assignedOrders": 11 },
      { "name": "Ella Stone", "role": "Picker", "status": "Active", "assignedOrders": 9 },
      { "name": "Grace Hall", "role": "Support", "status": "Active", "assignedOrders": 0 },
      { "name": "Harry King", "role": "Picker", "status": "Off Shift", "assignedOrders": 0 }
    ],
    "ordersToAssign": [
      { "id": 2201, "customer": "Ryan Cooper", "status": "Pending", "picker": "Unassigned" },
      { "id": 2202, "customer": "Mia Scott", "status": "Pending", "picker": "Unassigned" },
      { "id": 2203, "customer": "Leo Walker", "status": "Picking", "picker": "Chloe Green" },
      { "id": 2204, "customer": "Ava Morgan", "status": "Pending", "picker": "Unassigned" },
      { "id": 2205, "customer": "Olivia Reed", "status": "Picking", "picker": "Ben Smith" },
      { "id": 2206, "customer": "Noah Green", "status": "Pending", "picker": "Daniel Reed" },
      { "id": 2207, "customer": "Emily Foster", "status": "Pending", "picker": "Unassigned" },
      { "id": 2208, "customer": "Amelia Scott", "status": "Picking", "picker": "Ella Stone" },
      { "id": 2209, "customer": "Lucas White", "status": "Pending", "picker": "Unassigned" },
      { "id": 2210, "customer": "Harry Cooper", "status": "Pending", "picker": "Unassigned" }
    ],
    "promoCodes": [
      { "code": "SPRING15", "description": "15% off selected groceries", "discount": "15%", "status": "Active", "expiry": "2026-06-01" },
      { "code": "FRESH10", "description": "10% off fresh food", "discount": "10%", "status": "Active", "expiry": "2026-05-28" },
      { "code": "CLEAN10", "description": "10% off household and cleaning", "discount": "10%", "status": "Active", "expiry": "2026-06-10" },
      { "code": "SNACK20", "description": "20% off treats and snacks", "discount": "20%", "status": "Inactive", "expiry": "2026-05-10" },
      { "code": "DRINK12", "description": "12% off selected drinks", "discount": "12%", "status": "Active", "expiry": "2026-06-12" },
      { "code": "BEAUTY8", "description": "8% off health and beauty lines", "discount": "8%", "status": "Inactive", "expiry": "2026-05-21" },
      { "code": "HOME5", "description": "£5 off household baskets over £35", "discount": "£5", "status": "Active", "expiry": "2026-06-20" }
    ],
    "discounts": [
      { "product": "Tesco British Strawberries 400g", "category": "Fresh Food", "oldPricePence": 764, "newPricePence": 650, "status": "Active" },
      { "product": "Walkers Ready Salted Crisps 6 pack", "category": "Treats & Snacks", "oldPricePence": 216, "newPricePence": 180, "status": "Active" },
      { "product": "Haagen Dazs Vanilla 460ml", "category": "Frozen Food", "oldPricePence": 894, "newPricePence": 760, "status": "Active" },
      { "product": "Alpro Oat Drink 1L", "category": "Drinks", "oldPricePence": 974, "newPricePence": 850, "status": "Active" },
      { "product": "Ariel All in One Pods 24 pack", "category": "Household & Cleaning", "oldPricePence": 1341, "newPricePence": 1199, "status": "Active" },
      { "product": "Cathedral City Mature Cheddar 350g", "category": "Fresh Food", "oldPricePence": 420, "newPricePence": 350, "status": "Active" },
      { "product": "Tesco Free Range Large Eggs 12 pack", "category": "Fresh Food", "oldPricePence": 315, "newPricePence": 280, "status": "Active" }
    ]
  }'::jsonb
),
(
  'month',
  '{
    "totalSalesPence": 2146780,
    "totalSalesDisplay": "21,467.80",
    "orderCount": 562,
    "averageOrderValuePence": 3819,
    "averageOrderValueDisplay": "38.19",
    "bestSellers": [
      { "id": 1, "name": "Walkers Ready Salted Crisps 6 pack" },
      { "id": 2, "name": "Tesco British Strawberries 400g" },
      { "id": 3, "name": "Tesco Bakery Butter Croissants 4 pack" },
      { "id": 4, "name": "Alpro Oat Drink 1L" },
      { "id": 5, "name": "Haagen Dazs Vanilla 460ml" },
      { "id": 6, "name": "Ariel All in One Pods 24 pack" },
      { "id": 7, "name": "Andrex Gentle Clean Toilet Tissue 9 rolls" },
      { "id": 8, "name": "Coca Cola Zero Sugar 8 x 330ml" },
      { "id": 9, "name": "Cathedral City Mature Cheddar 350g" },
      { "id": 10, "name": "Tesco Free Range Large Eggs 12 pack" },
      { "id": 11, "name": "Warburtons Medium Sliced White Bread" },
      { "id": 12, "name": "Birds Eye Chicken Dippers 24 pack" }
    ],
    "salesPerCategory": [
      { "category": "Fresh Food", "salesPence": 472600 },
      { "category": "Bakery", "salesPence": 301200 },
      { "category": "Frozen Food", "salesPence": 258400 },
      { "category": "Treats & Snacks", "salesPence": 338500 },
      { "category": "Drinks", "salesPence": 268700 },
      { "category": "Groceries & Essentials", "salesPence": 182900 },
      { "category": "Household & Cleaning", "salesPence": 193400 },
      { "category": "Health & Beauty", "salesPence": 64880 },
      { "category": "Baby & Toddler", "salesPence": 28600 },
      { "category": "Pets", "salesPence": 37200 }
    ],
    "trendingItems": [
      { "rank": 1, "name": "Walkers Ready Salted Crisps 6 pack", "unitsSold": 286 },
      { "rank": 2, "name": "Tesco British Strawberries 400g", "unitsSold": 231 },
      { "rank": 3, "name": "Alpro Oat Drink 1L", "unitsSold": 182 },
      { "rank": 4, "name": "Tesco Bakery Butter Croissants 4 pack", "unitsSold": 168 },
      { "rank": 5, "name": "Ariel All in One Pods 24 pack", "unitsSold": 129 },
      { "rank": 6, "name": "Haagen Dazs Vanilla 460ml", "unitsSold": 122 },
      { "rank": 7, "name": "Andrex Gentle Clean Toilet Tissue 9 rolls", "unitsSold": 111 },
      { "rank": 8, "name": "Coca Cola Zero Sugar 8 x 330ml", "unitsSold": 109 },
      { "rank": 9, "name": "Cathedral City Mature Cheddar 350g", "unitsSold": 95 },
      { "rank": 10, "name": "Birds Eye Chicken Dippers 24 pack", "unitsSold": 83 }
    ],
    "staff": [
      { "name": "Alice Brown", "role": "Manager", "status": "Active", "assignedOrders": 0 },
      { "name": "Ben Smith", "role": "Picker", "status": "Active", "assignedOrders": 45 },
      { "name": "Chloe Green", "role": "Picker", "status": "Active", "assignedOrders": 39 },
      { "name": "Daniel Reed", "role": "Picker", "status": "Active", "assignedOrders": 35 },
      { "name": "Ella Stone", "role": "Picker", "status": "Active", "assignedOrders": 31 },
      { "name": "Grace Hall", "role": "Support", "status": "Active", "assignedOrders": 0 },
      { "name": "Harry King", "role": "Picker", "status": "On Leave", "assignedOrders": 0 },
      { "name": "Ivy Morgan", "role": "Picker", "status": "Active", "assignedOrders": 28 }
    ],
    "ordersToAssign": [
      { "id": 3201, "customer": "Emily King", "status": "Pending", "picker": "Unassigned" },
      { "id": 3202, "customer": "Noah Adams", "status": "Picking", "picker": "Ben Smith" },
      { "id": 3203, "customer": "Grace Turner", "status": "Pending", "picker": "Unassigned" },
      { "id": 3204, "customer": "Oliver Reed", "status": "Pending", "picker": "Unassigned" },
      { "id": 3205, "customer": "Amelia Scott", "status": "Picking", "picker": "Ella Stone" },
      { "id": 3206, "customer": "Lucas White", "status": "Pending", "picker": "Daniel Reed" },
      { "id": 3207, "customer": "Harry Cooper", "status": "Pending", "picker": "Unassigned" },
      { "id": 3208, "customer": "Mason Hall", "status": "Picking", "picker": "Chloe Green" },
      { "id": 3209, "customer": "Sofia Young", "status": "Pending", "picker": "Unassigned" },
      { "id": 3210, "customer": "Jacob Wright", "status": "Pending", "picker": "Ivy Morgan" },
      { "id": 3211, "customer": "Freya Lewis", "status": "Pending", "picker": "Unassigned" },
      { "id": 3212, "customer": "Charlie Cook", "status": "Picking", "picker": "Ben Smith" }
    ],
    "promoCodes": [
      { "code": "MONTH20", "description": "20% off selected lines this month", "discount": "20%", "status": "Active", "expiry": "2026-06-30" },
      { "code": "LOYALTY5", "description": "£5 off loyalty orders", "discount": "£5", "status": "Active", "expiry": "2026-07-15" },
      { "code": "CLEAN10", "description": "10% off household and cleaning", "discount": "10%", "status": "Active", "expiry": "2026-06-18" },
      { "code": "DRINKS12", "description": "12% off selected drinks", "discount": "12%", "status": "Active", "expiry": "2026-06-12" },
      { "code": "BABY8", "description": "8% off baby and toddler essentials", "discount": "8%", "status": "Inactive", "expiry": "2026-05-20" },
      { "code": "FRESH15", "description": "15% off fresh food over £25", "discount": "15%", "status": "Active", "expiry": "2026-06-09" },
      { "code": "SNACK10", "description": "10% off snack bundles", "discount": "10%", "status": "Active", "expiry": "2026-06-14" },
      { "code": "HOME6", "description": "£6 off home care orders over £40", "discount": "£6", "status": "Inactive", "expiry": "2026-05-29" }
    ],
    "discounts": [
      { "product": "Tesco British Strawberries 400g", "category": "Fresh Food", "oldPricePence": 764, "newPricePence": 650, "status": "Active" },
      { "product": "Walkers Ready Salted Crisps 6 pack", "category": "Treats & Snacks", "oldPricePence": 216, "newPricePence": 180, "status": "Active" },
      { "product": "Haagen Dazs Vanilla 460ml", "category": "Frozen Food", "oldPricePence": 894, "newPricePence": 760, "status": "Active" },
      { "product": "Ariel All in One Pods 24 pack", "category": "Household & Cleaning", "oldPricePence": 1341, "newPricePence": 1199, "status": "Active" },
      { "product": "Coca Cola Zero Sugar 8 x 330ml", "category": "Drinks", "oldPricePence": 480, "newPricePence": 425, "status": "Active" },
      { "product": "Cathedral City Mature Cheddar 350g", "category": "Fresh Food", "oldPricePence": 420, "newPricePence": 350, "status": "Active" },
      { "product": "Tesco Free Range Large Eggs 12 pack", "category": "Fresh Food", "oldPricePence": 315, "newPricePence": 280, "status": "Active" },
      { "product": "Warburtons Medium Sliced White Bread", "category": "Bakery", "oldPricePence": 145, "newPricePence": 120, "status": "Active" },
      { "product": "Birds Eye Chicken Dippers 24 pack", "category": "Frozen Food", "oldPricePence": 525, "newPricePence": 450, "status": "Active" }
    ]
  }'::jsonb
);