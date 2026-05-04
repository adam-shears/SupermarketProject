import { expect } from "chai";
import sinon from "sinon";
import * as service from "../src/service.js";

describe("Orders Service", () => {
  afterEach(() => sinon.restore());

  describe("addShoppingListItem", () => {
    it("should error when quantity is not a positive integer", async () => {
      await expect(
        service.addShoppingListItem(1, { productId: 1, quantity: 0 })
      ).to.be.rejectedWith(service.OrdersError, "quantity must be a positive integer");
      await expect(
        service.addShoppingListItem(1, { productId: 1, quantity: -5 })
      ).to.be.rejectedWith(service.OrdersError, "quantity must be a positive integer");
      await expect(
        service.addShoppingListItem(1, { productId: 1, quantity: 2.5 })
      ).to.be.rejectedWith(service.OrdersError, "quantity must be a positive integer");
    });

    it("should default quantity to 1 if not provided", async () => {
      sinon
        .stub(service.ordersDeps, "insertShoppingListItem")
        .resolves({ customerId: 1, productId: 1, quantity: 1 });

      const result = await service.addShoppingListItem(1, { productId: 1 });
      expect(result.quantity).to.equal(1);
      expect(service.ordersDeps.insertShoppingListItem.calledWith(1, 1, 1)).to.be.true;
    });
  });

  describe("updateShoppingListItem", () => {
    it("should error when trying to update an item that doesn't exist", async () => {
      sinon.stub(service.ordersDeps, "updateShoppingList").resolves(null);

      await expect(service.updateShoppingListItem(1, 1, { quantity: 2 })).to.be.rejectedWith(
        service.OrdersError,
        "shopping list item not found"
      );
    });
  });

  describe("registerNewUser", () => {
    it("should reject duplicated emails", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves({ id: 1 });
      await expect(
        service.registerNewUser({
          email: "test@example.com",
          password: "Password1!",
          confirmPassword: "Password1!",
          firstName: "Test",
          lastName: "User",
          phone: "1234567890",
        })
      ).to.be.rejectedWith(service.OrdersError, "Email is already in use");
    });

    it("should reject weak passwords", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
      await expect(
        service.registerNewUser({
          email: "test@example.com",
          password: "weak",
          confirmPassword: "weak",
          firstName: "Test",
          lastName: "User",
          phone: "1234567890",
        })
      ).to.be.rejectedWith(service.OrdersError, "Password must be at least 8 characters long");

      await expect(
        service.registerNewUser({
          email: "test@example.com",
          password: "eightcharactersbutstillweak",
          confirmPassword: "eightcharactersbutstillweak",
          firstName: "Test",
          lastName: "User",
          phone: "1234567890",
        })
      ).to.be.rejectedWith(
        service.OrdersError,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    });

    it("should reject passwords that don't match", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
      await expect(
        service.registerNewUser({
          email: "test@example.com",
          password: "Password1!",
          confirmPassword: "Password2!",
          firstName: "Test",
          lastName: "User",
          phone: "1234567890",
        })
      ).to.be.rejectedWith(service.OrdersError, "Passwords do not match");
    });

    it("should register a new user with valid input", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
      sinon
        .stub(service.ordersDeps, "insertNewCustomer")
        .resolves({ id: 1, email: "test@example.com" });
      sinon.stub(service.ordersDeps, "hashPassword").resolves("hashedpassword");

      const result = await service.registerNewUser({
        email: "test@example.com",
        password: "Password1!",
        confirmPassword: "Password1!",
        firstName: "Test",
        lastName: "User",
        phone: "1234567890",
      });

      expect(result).to.deep.equal({ id: 1, email: "test@example.com" });
      expect(service.ordersDeps.insertNewCustomer.calledOnce).to.be.true;
      expect(service.ordersDeps.hashPassword.calledOnce).to.be.true;
    });

    it("should reject users registering a staff email", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
      sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves(null);

      await expect(
        service.registerNewUser({
          email: "whatever@supermarket.com",
          password: "Password1!",
          confirmPassword: "Password1!",
          firstName: "Test",
          lastName: "User",
          phone: "1234567890",
        })
      ).to.be.rejectedWith(
        service.OrdersError,
        "You cannot register with a staff email. If you are a staff member, contact your administrator to register you."
      );
    });

    it("should register a new staff user", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
      sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves(null);
      sinon
        .stub(service.ordersDeps, "insertNewStaff")
        .resolves({ id: 1, email: "test@supermarket.com" });
      sinon.stub(service.ordersDeps, "hashPassword").resolves("hashedpassword");

      const result = await service.registerNewUser({
        email: "whatever@supermarket.com",
        password: "Password1!",
        confirmPassword: "Password1!",
        firstName: "Test",
        lastName: "Staff",
        phone: "1234567890",
        isStaff: true,
      });

      expect(result).to.deep.equal({ id: 1, email: "test@supermarket.com" });
      expect(service.ordersDeps.insertNewStaff.calledOnce).to.be.true;
      expect(service.ordersDeps.hashPassword.calledOnce).to.be.true;
    });

    it("should reject staff registration if email doesn't end with @supermarket.com", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
      sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves(null);

      await expect(
        service.registerNewUser({
          email: "whatever@rivalsupermarket.com",
          password: "Password1!",
          confirmPassword: "Password1!",
          firstName: "Test",
          lastName: "Staff",
          phone: "1234567890",
          isStaff: true,
        })
      ).to.be.rejectedWith(service.OrdersError, "Staff email must end with @supermarket.com");
    });

    it("should reject staff registration if email is already in use by another staff member", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
      sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves({ id: 1 });

      await expect(
        service.registerNewUser({
          email: "ialreadyexist@supermarket.com",
          password: "Password1!",
          confirmPassword: "Password1!",
          firstName: "Test",
          lastName: "Staff",
          phone: "1234567890",
          isStaff: true,
        })
      ).to.be.rejectedWith(service.OrdersError, "Email is already in use");
    });
  });

  describe("logCustomerIn", () => {
    it("should reject missing email or password", async () => {
      await expect(service.logCustomerIn({ email: "", password: "Password1!" })).to.be.rejectedWith(
        service.OrdersError,
        "Email and password are required"
      );
      await expect(
        service.logCustomerIn({ email: "test@example.com", password: "" })
      ).to.be.rejectedWith(service.OrdersError, "Email and password are required");
    describe("loyalty redemption", () => {
        it("should calculate purchase points based on the customer's current tier", () => {
            expect(service.calculatePointsFromPurchase(1099, "Bronze")).to.equal(10);
            expect(service.calculatePointsFromPurchase(1099, "Silver")).to.equal(21);
            expect(service.calculatePointsFromPurchase(1099, "Gold")).to.equal(32);
        });

        it("should calculate the maximum redeemable points in 100 point chunks", () => {
            expect(service.calculateRedeemablePoints(3450, 3391)).to.equal(3300);
            expect(service.calculateRedeemablePoints(90, 5000)).to.equal(0);
            expect(service.calculateRedeemablePoints(1000, 99)).to.equal(0);
        });

        it("should automatically redeem the maximum available points when points are not provided", async () => {
            sinon.stub(service.ordersDeps, "selectLoyaltyAccountByCustomerId").resolves({
                id: 10,
                points: 3450,
                tier: "Silver",
            });
            sinon.stub(service.ordersDeps, "updateLoyaltyAccountPoints").resolves({
                id: 10,
                points: 150,
                tier: "Silver",
            });
            sinon.stub(service.ordersDeps, "insertLoyaltyTransaction").resolves({});

            const result = await service.redeemPoints(1, NaN, 3391);

            expect(result).to.deep.equal({
                pointsRedeemed: 3300,
                discountPence: 3300,
                remainingPoints: 150,
            });
            expect(service.ordersDeps.updateLoyaltyAccountPoints.calledWith(10, 150, "Silver")).to.be.true;
            expect(service.ordersDeps.insertLoyaltyTransaction.calledWith(10, null, "redemption", -3300)).to.be.true;
        });

        it("should reject redemption when fewer than 100 points can be used", async () => {
            sinon.stub(service.ordersDeps, "selectLoyaltyAccountByCustomerId").resolves({
                id: 10,
                points: 90,
                tier: "Bronze",
            });

            await expect(service.redeemPoints(1, NaN, 5000)).to.be.rejectedWith(service.OrdersError, "At least 100 points are required to redeem");
        });

        it("should not downgrade tier when points are redeemed", async () => {
            sinon.stub(service.ordersDeps, "selectLoyaltyAccountByCustomerId").resolves({
                id: 10,
                points: 5200,
                tier: "Gold",
            });
            sinon.stub(service.ordersDeps, "updateLoyaltyAccountPoints").resolves({
                id: 10,
                points: 200,
                tier: "Gold",
            });
            sinon.stub(service.ordersDeps, "insertLoyaltyTransaction").resolves({});

            await service.redeemPoints(1, 5000, 5000);

            expect(service.ordersDeps.updateLoyaltyAccountPoints.calledWith(10, 200, "Gold")).to.be.true;
        });

        it("should not downgrade tier when purchase points are added after redemption", async () => {
            sinon.stub(service.ordersDeps, "selectLoyaltyAccountByCustomerId").resolves({
                id: 10,
                points: 200,
                tier: "Gold",
            });
            sinon.stub(service.ordersDeps, "updateLoyaltyAccountPoints").resolves({
                id: 10,
                points: 300,
                tier: "Gold",
            });
            sinon.stub(service.ordersDeps, "insertLoyaltyTransaction").resolves({});
            sinon.stub(service.ordersDeps, "selectLoyaltyTierBenefits").resolves(null);

            await service.addLoyaltyPoints(1, {amount: 100, type: "purchase", orderId: 99});

            expect(service.ordersDeps.updateLoyaltyAccountPoints.calledWith(10, 300, "Gold")).to.be.true;
        });
    });

    describe("createOrder", () => {
        const snapshot = {
            subtotalPence: 1299,
            discountPence: 200,
            totalPence: 1099,
            items: [
                {
                    product_id: 1,
                    quantity: 1,
                    price_pence_per_unit: 1299,
                    line_subtotal_pence: 1299,
                    line_discount_pence: 200,
                    applied_discount_id: null,
                    line_total_pence: 1099,
                },
            ],
        };
        const deliveryInfo = {
            addressLine: "1 Test Street",
            town: "Testville",
            county: "Testshire",
            postcode: "TE1 1ST",
        };

        it("should include selected loyalty discounts in the checkout snapshot", async () => {
            sinon.stub(service.ordersDeps, "selectBasketPriceLinesByCustomerId").resolves([
                { product_id: 1, quantity: 1, price_pence: 1099, name: "Test Product" },
            ]);
            sinon.stub(service.ordersDeps, "selectActiveDiscountsForProducts").resolves([]);
            sinon.stub(service.ordersDeps, "reserveStock").resolves({ reserved: true, unavailableItems: [] });
            sinon.stub(service.ordersDeps, "selectLoyaltyAccountByCustomerId").resolves({
                id: 10,
                points: 500,
                tier: "Bronze",
            });
            sinon.stub(service.ordersDeps, "selectUnusedLoyaltyCouponsByAccountId").resolves([
                {
                    id: 20,
                    code: "LOYALTY-TEST",
                    discount_percent: 10,
                    min_spend_pence: 100,
                },
            ]);

            const result = await service.getLoggedInCheckoutSnapshot(1, null, {
                useLoyaltyCoupon: true,
                useLoyaltyPoints: true,
            });

            expect(result.discountPence).to.equal(609);
            expect(result.totalPence).to.equal(490);
            expect(result.orderDiscounts).to.deep.include({
                type: "loyalty_points",
                label: "Loyalty points",
                pointsRedeemed: 500,
                orderTotalPence: 990,
                discountPence: 500,
            });
        });

        it("should award loyalty points after creating a customer order", async () => {
            sinon.stub(service.ordersDeps, "insertOrder").resolves(99);
            sinon.stub(service.ordersDeps, "selectLoyaltyAccountByCustomerId")
                .onFirstCall()
                .resolves({ id: 10, points: 100, tier: "Silver" })
                .onSecondCall()
                .resolves({ id: 10, points: 100, tier: "Silver" });
            sinon.stub(service.ordersDeps, "updateLoyaltyAccountPoints").resolves({
                id: 10,
                points: 121,
                tier: "Silver",
            });
            sinon.stub(service.ordersDeps, "insertLoyaltyTransaction").resolves({});

            const result = await service.createOrder(snapshot, deliveryInfo, 1);

            expect(result).to.equal(99);
            expect(service.ordersDeps.insertOrder.calledOnce).to.be.true;
            expect(service.ordersDeps.updateLoyaltyAccountPoints.calledWith(10, 121, "Silver")).to.be.true;
            expect(service.ordersDeps.insertLoyaltyTransaction.calledWith(10, 99, "purchase", 21)).to.be.true;
        });

        it("should consume selected loyalty discounts when creating a customer order", async () => {
            const discountedSnapshot = {
                ...snapshot,
                discountPence: 500,
                totalPence: 799,
                orderDiscounts: [
                    {
                        type: "loyalty_coupon",
                        couponCode: "LOYALTY-TEST",
                        discountPence: 300,
                        orderTotalPence: 1099,
                    },
                    {
                        type: "loyalty_points",
                        pointsRedeemed: 200,
                        discountPence: 200,
                        orderTotalPence: 799,
                    },
                ],
            };

            sinon.stub(service.ordersDeps, "insertOrder").resolves(99);
            sinon.stub(service.ordersDeps, "selectLoyaltyCouponByCode").resolves({
                id: 20,
                loyalty_account_id: 10,
                code: "LOYALTY-TEST",
                discount_percent: 27.3,
                min_spend_pence: 100,
                expires_at: new Date(Date.now() + 100000),
                used_at: null,
            });
            sinon.stub(service.ordersDeps, "markLoyaltyCouponAsUsed").resolves({});
            sinon.stub(service.ordersDeps, "selectLoyaltyAccountByCustomerId")
                .onFirstCall()
                .resolves({ id: 10, points: 500, tier: "Bronze" })
                .onSecondCall()
                .resolves({ id: 10, points: 500, tier: "Bronze" })
                .onThirdCall()
                .resolves({ id: 10, points: 300, tier: "Bronze" })
                .onCall(3)
                .resolves({ id: 10, points: 300, tier: "Bronze" });
            sinon.stub(service.ordersDeps, "updateLoyaltyAccountPoints")
                .onFirstCall()
                .resolves({ id: 10, points: 300, tier: "Bronze" })
                .onSecondCall()
                .resolves({ id: 10, points: 307, tier: "Bronze" });
            sinon.stub(service.ordersDeps, "insertLoyaltyTransaction").resolves({});
            sinon.stub(service.ordersDeps, "selectLoyaltyTierBenefits").resolves(null);

            const result = await service.createOrder(discountedSnapshot, deliveryInfo, 1);

            expect(result).to.equal(99);
            expect(service.ordersDeps.markLoyaltyCouponAsUsed.calledWith(20)).to.be.true;
            expect(service.ordersDeps.insertLoyaltyTransaction.calledWith(10, 99, "redemption", -200)).to.be.true;
            expect(service.ordersDeps.insertLoyaltyTransaction.calledWith(10, 99, "purchase", 7)).to.be.true;
        });

        it("should not award loyalty points for guest orders", async () => {
            sinon.stub(service.ordersDeps, "insertOrder").resolves(100);
            sinon.stub(service.ordersDeps, "selectLoyaltyAccountByCustomerId").resolves(null);

            const result = await service.createOrder(snapshot, deliveryInfo, null, {
                name: "Guest User",
                email: "guest@example.com",
                phone: "1234567890",
            });

            expect(result).to.equal(100);
            expect(service.ordersDeps.insertOrder.calledOnce).to.be.true;
            expect(service.ordersDeps.selectLoyaltyAccountByCustomerId.notCalled).to.be.true;
        });
    });

    describe("registerNewUser", () => {
        it("should reject duplicated emails", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves({id: 1});
            await expect(service.registerNewUser({
                email: "test@example.com",
                password: "Password1!",
                confirmPassword: "Password1!",
                firstName: "Test",
                lastName: "User",
                phone: "1234567890",
            })).to.be.rejectedWith(service.OrdersError, "Email is already in use");
        });

        it("should reject weak passwords", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
            await expect(service.registerNewUser({
                email: "test@example.com",
                password: "weak",
                confirmPassword: "weak",
                firstName: "Test",
                lastName: "User",
                phone: "1234567890",
            })).to.be.rejectedWith(service.OrdersError, "Password must be at least 8 characters long");

            await expect(service.registerNewUser({
                email: "test@example.com",
                password: "eightcharactersbutstillweak",
                confirmPassword: "eightcharactersbutstillweak",
                firstName: "Test",
                lastName: "User",
                phone: "1234567890",
             })).to.be.rejectedWith(service.OrdersError, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");
        });

        it("should reject passwords that don't match", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
            await expect(service.registerNewUser({
                email: "test@example.com",
                password: "Password1!",
                confirmPassword: "Password2!",
                firstName: "Test",
                lastName: "User",
                phone: "1234567890",
            })).to.be.rejectedWith(service.OrdersError, "Passwords do not match");
        });

        it("should reject phone numbers with non-digit characters", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);

            await expect(service.registerNewUser({
                email: "test@example.com",
                password: "Password1!",
                confirmPassword: "Password1!",
                firstName: "Test",
                lastName: "User",
                phone: "+44 123",
            })).to.be.rejectedWith(service.OrdersError, "Phone must contain digits only");
        });

        it("should register a new user with valid input", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
            sinon.stub(service.ordersDeps, "insertNewCustomerWithLoyalty").resolves({id: 1, email: "test@example.com"});
            sinon.stub(service.ordersDeps, "hashPassword").resolves("hashedpassword");

            const result = await service.registerNewUser({
                email: "test@example.com",
                password: "Password1!",
                confirmPassword: "Password1!",
                firstName: "Test",
                lastName: "User",
                phone: "1234567890",
            });

            expect(result).to.deep.equal({id: 1, email: "test@example.com"});
            expect(service.ordersDeps.insertNewCustomerWithLoyalty.calledOnce).to.be.true;
            expect(
                service.ordersDeps.insertNewCustomerWithLoyalty.calledWith(
                    "test@example.com",
                    "hashedpassword",
                    "Test",
                    "User",
                    "1234567890",
                    "Bronze",
                    0
                )
            ).to.be.true;
            expect(service.ordersDeps.hashPassword.calledOnce).to.be.true;
        });

        it("should reject users registering a staff email", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
            sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves(null);

            await expect(service.registerNewUser({
                email: "whatever@supermarket.com",
                password: "Password1!",
                confirmPassword: "Password1!",
                firstName: "Test",
                lastName: "User",
                phone: "1234567890",
            })).to.be.rejectedWith(service.OrdersError, "You cannot register with a staff email. If you are a staff member, contact your administrator to register you.");
        });

        it("should register a new staff user", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
            sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves(null);
            sinon.stub(service.ordersDeps, "insertNewStaff").resolves({id: 1, email: "test@supermarket.com"});
            sinon.stub(service.ordersDeps, "hashPassword").resolves("hashedpassword");

            const result = await service.registerNewUser({
                email: "whatever@supermarket.com",
                password: "Password1!",
                confirmPassword: "Password1!",
                firstName: "Test",
                lastName: "Staff",
                phone: "1234567890",
                isStaff: true
            });

            expect(result).to.deep.equal({id: 1, email: "test@supermarket.com"});
            expect(service.ordersDeps.insertNewStaff.calledOnce).to.be.true;
            expect(service.ordersDeps.hashPassword.calledOnce).to.be.true;
        });

        it("should reject staff registration if email doesn't end with @supermarket.com", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
            sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves(null);

            await expect(service.registerNewUser({
                email: "whatever@rivalsupermarket.com",
                password: "Password1!",
                confirmPassword: "Password1!",
                firstName: "Test",
                lastName: "Staff",
                phone: "1234567890",
                isStaff: true
            })).to.be.rejectedWith(service.OrdersError, "Staff email must end with @supermarket.com");
        });

        it("should reject staff registration if email is already in use by another staff member", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
            sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves({id: 1});

            await expect(service.registerNewUser({
                email: "ialreadyexist@supermarket.com",
                password: "Password1!",
                confirmPassword: "Password1!",
                firstName: "Test",
                lastName: "Staff",
                phone: "1234567890",
                isStaff: true
            })).to.be.rejectedWith(service.OrdersError, "Email is already in use");
        });
    });

    it("should resolve staff vs customer based on email domain", async () => {
      sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves({
        id: 1,
        email: "test@supermarket.com",
        password_hash: "hashedpassword",
        first_name: "Test",
        last_name: "Staff",
        phone: "1234567890",
        created_at: "2026-01-01T00:00:00.000Z",
      });
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves({
        id: 2,
        email: "test@example.com",
        password_hash: "hashedpassword",
        first_name: "Test",
        last_name: "Customer",
        phone: "1234567890",
        created_at: "2026-01-01T00:00:00.000Z",
      });
      sinon.stub(service.ordersDeps, "comparePassword").resolves(true);

      await service.logCustomerIn({ email: "test@supermarket.com", password: "Password1!" });
      expect(service.ordersDeps.selectStaffByEmail.calledOnce).to.be.true;
      expect(service.ordersDeps.selectCustomerByEmail.notCalled).to.be.true;

      await service.logCustomerIn({ email: "test@example.com", password: "Password1!" });
      expect(service.ordersDeps.selectCustomerByEmail.calledOnce).to.be.true;
      expect(service.ordersDeps.selectStaffByEmail.calledOnce).to.be.true; // still only called once from previous test
    });

    it("should reject invalid email or password", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
      sinon.stub(service.ordersDeps, "selectStaffByEmail").resolves({
        id: 1,
        email: "test@supermarket.com",
        password_hash: "hashedpassword",
        first_name: "Test",
        last_name: "Staff",
        phone: "1234567890",
        created_at: "2026-01-01T00:00:00.000Z",
      });
      sinon.stub(service.ordersDeps, "comparePassword").resolves(false);

      await expect(
        service.logCustomerIn({ email: "test@example.com", password: "Password1!" })
      ).to.be.rejectedWith(service.OrdersError, "Invalid email or password");
      await expect(
        service.logCustomerIn({ email: "test@supermarket.com", password: "Password1!" })
      ).to.be.rejectedWith(service.OrdersError, "Invalid email or password");
    });

    it("should log customer in with valid credentials", async () => {
      sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves({
        id: 1,
        email: "test@example.com",
        password_hash: "hashedpassword",
        first_name: "Test",
        last_name: "Customer",
        phone: "1234567890",
        created_at: "2026-01-01T00:00:00.000Z",
      });
      sinon.stub(service.ordersDeps, "comparePassword").resolves(true);

      const result = await service.logCustomerIn({
        email: "test@example.com",
        password: "Password1!",
      });
      expect(result).to.deep.equal({
        id: 1,
        admin_level: 0,
        email: "test@example.com",
        first_name: "Test",
        last_name: "Customer",
        phone: "1234567890",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    });
  });

  describe("calculateDiscounts", () => {
    it("should calculate percentage discounts correctly", () => {
      const line = { product_id: 1, quantity: 2, price_pence: 1000 };
      const discount = { type: "percentage", value: 20 }; // 20% off
      const result = service.calculateDiscounts(line, discount);
      expect(result).to.equal(400); // 20% of £20 total is £4
    });

    it("should calculate fixed amount discounts correctly", () => {
      const line = { product_id: 1, quantity: 2, price_pence: 1000 };
      const discount = { type: "fixed", value: 300 }; // £3 off
      const result = service.calculateDiscounts(line, discount);
      expect(result).to.equal(600); // £3 off twice because 2 quantity
    });

    it("should not allow discounts to exceed line total", () => {
      const line = { product_id: 1, quantity: 2, price_pence: 1000 };
      const discount = { type: "fixed", value: 2500 }; // £25 off
      const result = service.calculateDiscounts(line, discount);
      expect(result).to.equal(2000); // cannot exceed total of £20
    });

    it("should return 0 for invalid discount types", () => {
      const line = { product_id: 1, quantity: 2, price_pence: 1000 };
      const discount = { type: "blahhabbsavbdsavabsd", value: 50 };
      const result = service.calculateDiscounts(line, discount);
      expect(result).to.equal(0);
    });
  });

  describe("calculateLineTotals", () => {
    it("should calculate line totals with discounts applied", () => {
      const lines = [
        { product_id: 1, quantity: 2, price_pence: 1000 },
        { product_id: 2, quantity: 1, price_pence: 500 },
      ];
      const discounts = [
        { product_id: 1, type: "percentage", value: 20 }, // 20% off product 1
        { product_id: 2, type: "fixed", value: 200 }, // £2 off product 2
      ];
      const result = service.calculateLineTotals(lines, discounts);
      expect(result).to.deep.equal({
        subtotal: 2500,
        discounts: 600,
        total: 1900,
        promoApplied: false,
      });
    });
  });
});
