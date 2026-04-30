import { expect } from 'chai';
import sinon from 'sinon';
import * as service from '../src/service.js';

describe("Orders Service", () => {
    afterEach(() => sinon.restore());

    describe("addShoppingListItem", () => {
        it("should error when quantity is not a positive integer", async () => {
            await expect(service.addShoppingListItem(1, {productId: 1, quantity: 0})).to.be.rejectedWith(service.OrdersError, "quantity must be a positive integer");
            await expect(service.addShoppingListItem(1, {productId: 1, quantity: -5})).to.be.rejectedWith(service.OrdersError, "quantity must be a positive integer");
            await expect(service.addShoppingListItem(1, {productId: 1, quantity: 2.5})).to.be.rejectedWith(service.OrdersError, "quantity must be a positive integer");
        });

        it("should default quantity to 1 if not provided", async () => {
            sinon.stub(service.ordersDeps, "insertShoppingListItem").resolves({customerId: 1, productId: 1, quantity: 1});

            const result = await service.addShoppingListItem(1, {productId: 1});
            expect(result.quantity).to.equal(1);
            expect(service.ordersDeps.insertShoppingListItem.calledWith(1, 1, 1)).to.be.true;
        });
    });

    describe("updateShoppingListItem", () => {
        it("should error when trying to update an item that doesn't exist", async () => {
            sinon.stub(service.ordersDeps, "updateShoppingList").resolves(null);

            await expect(service.updateShoppingListItem(1, 1, {quantity: 2})).to.be.rejectedWith(service.OrdersError, "shopping list item not found");
        });
    });

    describe("loyalty redemption", () => {
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
                tier: "Bronze",
            });
            sinon.stub(service.ordersDeps, "insertLoyaltyTransaction").resolves({});

            const result = await service.redeemPoints(1, NaN, 3391);

            expect(result).to.deep.equal({
                pointsRedeemed: 3300,
                discountPence: 3300,
                remainingPoints: 150,
            });
            expect(service.ordersDeps.updateLoyaltyAccountPoints.calledWith(10, 150, "Bronze")).to.be.true;
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

    describe("logCustomerIn", () => {
        it("should reject missing email or password", async () => {
            await expect(service.logCustomerIn({email: "", password: "Password1!"})).to.be.rejectedWith(service.OrdersError, "Email and password are required");
            await expect(service.logCustomerIn({email: "test@example.com", password: ""})).to.be.rejectedWith(service.OrdersError, "Email and password are required");
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

            await service.logCustomerIn({email:"test@supermarket.com", password: "Password1!"});
            expect(service.ordersDeps.selectStaffByEmail.calledOnce).to.be.true;
            expect(service.ordersDeps.selectCustomerByEmail.notCalled).to.be.true;

            await service.logCustomerIn({email:"test@example.com", password: "Password1!"});
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

            await expect(service.logCustomerIn({email: "test@example.com", password: "Password1!"})).to.be.rejectedWith(service.OrdersError, "Invalid email or password");
            await expect(service.logCustomerIn({email: "test@supermarket.com", password: "Password1!"})).to.be.rejectedWith(service.OrdersError, "Invalid email or password");
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

            const result = await service.logCustomerIn({email: "test@example.com", password: "Password1!"});
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
            const line = {product_id: 1, quantity: 2, price_pence: 1000};
            const discount = {type: "percentage", value: 20}; // 20% off
            const result = service.calculateDiscounts(line, discount);
            expect(result).to.equal(400); // 20% of £20 total is £4
        });

        it("should calculate fixed amount discounts correctly", () => {
            const line = {product_id: 1, quantity: 2, price_pence: 1000};
            const discount = {type: "fixed", value: 300}; // £3 off
            const result = service.calculateDiscounts(line, discount);
            expect(result).to.equal(600); // £3 off twice because 2 quantity
        });

        it("should not allow discounts to exceed line total", () => {
            const line = {product_id: 1, quantity: 2, price_pence: 1000};
            const discount = {type: "fixed", value: 2500}; // £25 off
            const result = service.calculateDiscounts(line, discount);
            expect(result).to.equal(2000); // cannot exceed total of £20
        });

        it("should return 0 for invalid discount types", () => {
            const line = {product_id: 1, quantity: 2, price_pence: 1000};
            const discount = {type: "blahhabbsavbdsavabsd", value: 50};
            const result = service.calculateDiscounts(line, discount);
            expect(result).to.equal(0);
        });
    });

    describe("calculateLineTotals", () => {
        it("should calculate line totals with discounts applied", () => {
            const lines = [
                {product_id: 1, quantity: 2, price_pence: 1000},
                {product_id: 2, quantity: 1, price_pence: 500},
            ];
            const discounts = [
                {product_id: 1, type: "percentage", value: 20}, // 20% off product 1
                {product_id: 2, type: "fixed", value: 200}, // £2 off product 2
            ];
            const result = service.calculateLineTotals(lines, discounts);
            expect(result).to.deep.equal({
                subtotal: 2500,
                discounts: 600,
                total: 1900,
                promoApplied: false
            });
        });
    })
});
