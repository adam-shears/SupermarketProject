import { expect } from "chai";
import sinon from "sinon";
import * as service from "../src/service.js";

describe("Warehouse Service", () => {
  afterEach(() => sinon.restore());

  describe("getPickerOrders", () => {
    it("should return an empty array when no rows are returned", async () => {
      sinon.stub(service.warehouseDeps, "getPickerOrdersRows").resolves([]);

      const result = await service.getPickerOrders();

      expect(result).to.deep.equal([]);
    });

    it("should group rows into orders and attach substitutes", async () => {
      sinon.stub(service.warehouseDeps, "getPickerOrdersRows").resolves([
        {
          order_id: 101,
          product_id: 1,
          quantity: 1,
          picked: false,
          picked_at: null,
          substituted_product_id: null,
          product_name: "Milk",
          product_description: "Fresh milk",
          category_name: "Fresh Food",
          location_code: "A-12",
          stock_quantity: 7,
          customer_name: "Alice Smith",
          item_count: 2,
          substituted_product_name: null,
          issue_id: null,
          issue_reason: null,
          issue_resolved: null,
          issue_substitute_product_id: null,
          issue_created_at: null,
        },
        {
          order_id: 101,
          product_id: 2,
          quantity: 2,
          picked: true,
          picked_at: "2026-01-01T10:00:00.000Z",
          substituted_product_id: null,
          product_name: "Bread",
          product_description: "Wholemeal bread",
          category_name: "Bakery",
          location_code: "B-04",
          stock_quantity: 5,
          customer_name: "Alice Smith",
          item_count: 2,
          substituted_product_name: null,
          issue_id: 9,
          issue_reason: "damaged",
          issue_resolved: false,
          issue_substitute_product_id: null,
          issue_created_at: "2026-01-01T11:00:00.000Z",
        },
      ]);

      sinon.stub(service.warehouseDeps, "getSubstituteProducts").resolves([
        { id: 7, name: "Alt Item", location_code: "Z-99" },
      ]);

      const result = await service.getPickerOrders();

      expect(result).to.have.lengthOf(1);
      expect(result[0].id).to.equal(101);
      expect(result[0].items).to.have.lengthOf(2);
      expect(result[0].items[0].substitutes).to.deep.equal([
        { id: 7, name: "Alt Item", location_code: "Z-99" },
      ]);
      expect(result[0].items[1].issue).to.deep.equal({
        id: 9,
        reason: "damaged",
        resolved: false,
        substitute_product_id: null,
        created_at: "2026-01-01T11:00:00.000Z",
      });
    });
  });

  describe("completePickerItem", () => {
    it("should throw if orderId or productId is missing", async () => {
      await expect(service.completePickerItem(null, 1)).to.be.rejectedWith(
        "orderId and productId are required"
      );
    });

    it("should throw if the order item does not exist", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves(null);

      await expect(service.completePickerItem(101, 1)).to.be.rejectedWith(
        "Order item not found"
      );
    });

    it("should return already picked if item is already picked", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves({
        order_id: 101,
        product_id: 1,
        quantity: 1,
        picked: true,
      });

      const result = await service.completePickerItem(101, 1);

      expect(result).to.deep.equal({
        message: "Item already marked as picked",
        item: {
          order_id: 101,
          product_id: 1,
          quantity: 1,
          picked: true,
        },
      });
    });

    it("should mark the item as picked when valid", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves({
        order_id: 101,
        product_id: 1,
        quantity: 1,
        picked: false,
      });

      sinon.stub(service.warehouseDeps, "markItemAsPicked").resolves({
        order_id: 101,
        product_id: 1,
        quantity: 1,
        picked: true,
        picked_at: "2026-01-01T12:00:00.000Z",
      });

      const result = await service.completePickerItem(101, 1);

      expect(result.message).to.equal("Picker item marked as completed");
      expect(result.item.picked).to.equal(true);
    });
  });

  describe("reportPickerIssue", () => {
    it("should throw if orderId or productId is missing", async () => {
      await expect(
        service.reportPickerIssue(null, 1, { reason: "damaged" })
      ).to.be.rejectedWith("orderId and productId are required");
    });

    it("should throw if reason is missing", async () => {
      await expect(
        service.reportPickerIssue(101, 1, {})
      ).to.be.rejectedWith("Reason is required");
    });

    it("should throw if order item does not exist", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves(null);

      await expect(
        service.reportPickerIssue(101, 1, { reason: "damaged" })
      ).to.be.rejectedWith("Order item not found");
    });

    it("should create an issue without substitution", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves({
        order_id: 101,
        product_id: 1,
      });

      sinon.stub(service.warehouseDeps, "insertPickerIssue").resolves({
        id: 5,
        order_id: 101,
        product_id: 1,
        substitute_product_id: null,
        reason: "damaged",
        resolved: false,
      });

      const result = await service.reportPickerIssue(101, 1, { reason: "damaged" });

      expect(result.message).to.equal("Picker issue reported successfully");
      expect(result.issue.reason).to.equal("damaged");
    });

    it("should create an issue and apply substitution if substituteProductId is given", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves({
        order_id: 101,
        product_id: 1,
      });

      sinon.stub(service.warehouseDeps, "insertPickerIssue").resolves({
        id: 6,
        order_id: 101,
        product_id: 1,
        substitute_product_id: 3,
        reason: "out_of_stock",
        resolved: false,
      });

      const applyStub = sinon
        .stub(service.warehouseDeps, "applySubstitution")
        .resolves({
          order_id: 101,
          product_id: 1,
          substituted_product_id: 3,
        });

      const result = await service.reportPickerIssue(101, 1, {
        reason: "out_of_stock",
        substituteProductId: 3,
      });

      expect(result.message).to.equal("Picker issue reported successfully");
      expect(applyStub.calledOnceWith(101, 1, 3)).to.equal(true);
    });
  });

  describe("resolvePickerIssue", () => {
    it("should throw if issueId is missing", async () => {
      await expect(service.resolvePickerIssue()).to.be.rejectedWith("issueId is required");
    });

    it("should throw if the issue does not exist", async () => {
      sinon.stub(service.warehouseDeps, "resolvePickerIssue").resolves(null);

      await expect(service.resolvePickerIssue(5)).to.be.rejectedWith("Issue not found");
    });

    it("should resolve the issue successfully", async () => {
      sinon.stub(service.warehouseDeps, "resolvePickerIssue").resolves({
        id: 5,
        resolved: true,
      });

      const result = await service.resolvePickerIssue(5);

      expect(result).to.deep.equal({
        message: "Issue resolved successfully",
        issue: {
          id: 5,
          resolved: true,
        },
      });
    });
  });

  describe("getInventory", () => {
    it("should return inventory rows from the db dependency", async () => {
      sinon.stub(service.warehouseDeps, "getInventoryRows").resolves([
        { id: 1, name: "Milk", quantity: 10, location_code: "A-12" },
      ]);

      const result = await service.getInventory();

      expect(result).to.deep.equal([
        { id: 1, name: "Milk", quantity: 10, location_code: "A-12" },
      ]);
    });
  });

  describe("updateInventory", () => {
    it("should throw if productId is missing", async () => {
      await expect(
        service.updateInventory(null, { quantity: 2, locationCode: "A-12" })
      ).to.be.rejectedWith("productId is required");
    });

    it("should throw if quantity is invalid", async () => {
      await expect(
        service.updateInventory(1, { quantity: "abc", locationCode: "A-12" })
      ).to.be.rejectedWith("Quantity must be a non-negative number");
    });

    it("should throw if quantity is negative", async () => {
      await expect(
        service.updateInventory(1, { quantity: -1, locationCode: "A-12" })
      ).to.be.rejectedWith("Quantity must be a non-negative number");
    });

    it("should throw if location code is missing", async () => {
      await expect(
        service.updateInventory(1, { quantity: 2, locationCode: "" })
      ).to.be.rejectedWith("Location code is required");
    });

    it("should update inventory successfully", async () => {
      sinon.stub(service.warehouseDeps, "updateInventoryItem").resolves({
        productId: 1,
        quantity: 9,
        locationCode: "B-04",
      });

      const result = await service.updateInventory(1, {
        quantity: 9,
        locationCode: "B-04",
      });

      expect(result).to.deep.equal({
        message: "Inventory updated successfully",
        item: {
          productId: 1,
          quantity: 9,
          locationCode: "B-04",
        },
      });
    });
  });
});