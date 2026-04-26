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

        it("should register a new user with valid input", async () => {
            sinon.stub(service.ordersDeps, "selectCustomerByEmail").resolves(null);
            sinon.stub(service.ordersDeps, "insertNewCustomer").resolves({id: 1, email: "test@example.com"});
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
            expect(service.ordersDeps.insertNewCustomer.calledOnce).to.be.true;
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
});
