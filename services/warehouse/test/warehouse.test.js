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
          order_status: "pending",
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
          order_status: "pending",
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
      expect(result[0].status).to.equal("pending");
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
      expect(result[0].hasUnresolvedIssues).to.equal(true);
      expect(result[0].hasUnpickedItems).to.equal(true);
    });
  });

  describe("completePickerItem", () => {
    it("should throw if orderId or productId is missing", async () => {
      try {
        await service.completePickerItem(null, 1);
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("orderId and productId are required");
      }
    });

    it("should throw if the order item does not exist", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves(null);

      try {
        await service.completePickerItem(101, 1);
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("Order item not found");
      }
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
      try {
        await service.reportPickerIssue(null, 1, { reason: "damaged" });
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("orderId and productId are required");
      }
    });

    it("should throw if reason is missing", async () => {
      try {
        await service.reportPickerIssue(101, 1, {});
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("Reason is required");
      }
    });

    it("should throw if order item does not exist", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves(null);

      try {
        await service.reportPickerIssue(101, 1, { reason: "damaged" });
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("Order item not found");
      }
    });

    it("should create an issue without substitution", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves({
        order_id: 101,
        product_id: 1,
        quantity: 2,
        picked: false,
      });

      sinon.stub(service.warehouseDeps, "insertPickerIssue").resolves({
        id: 501,
        order_id: 101,
        product_id: 1,
        substitute_product_id: null,
        reason: "damaged",
        resolved: false,
        created_at: "2026-04-12T10:00:00Z",
      });

      sinon.stub(service.warehouseDeps, "insertManagementAlert").resolves({
        id: 1,
        issue_id: 501,
        order_id: 101,
        product_id: 1,
        message: "Stock issue reported",
        resolved: false,
      });

      const result = await service.reportPickerIssue(101, 1, {
        reason: "damaged",
      });

      expect(result).to.deep.equal({
        message: "Picker issue reported successfully",
        issue: {
          id: 501,
          order_id: 101,
          product_id: 1,
          substitute_product_id: null,
          reason: "damaged",
          resolved: false,
          created_at: "2026-04-12T10:00:00Z",
        },
      });

      expect(service.warehouseDeps.insertManagementAlert.calledOnce).to.equal(true);
    });

    it("should create an issue and apply substitution if substituteProductId is given", async () => {
      sinon.stub(service.warehouseDeps, "getOrderItem").resolves({
        order_id: 101,
        product_id: 1,
        quantity: 2,
        picked: false,
      });

      sinon.stub(service.warehouseDeps, "insertPickerIssue").resolves({
        id: 502,
        order_id: 101,
        product_id: 1,
        substitute_product_id: 99,
        reason: "out_of_stock",
        resolved: false,
        created_at: "2026-04-12T10:05:00Z",
      });

      sinon.stub(service.warehouseDeps, "applySubstitution").resolves({
        order_id: 101,
        product_id: 1,
        substituted_product_id: 99,
      });

      sinon.stub(service.warehouseDeps, "insertManagementAlert").resolves({
        id: 2,
        issue_id: 502,
        order_id: 101,
        product_id: 1,
        message: "Stock issue reported",
        resolved: false,
      });

      const result = await service.reportPickerIssue(101, 1, {
        substituteProductId: 99,
        reason: "out_of_stock",
      });

      expect(result).to.deep.equal({
        message: "Picker issue reported successfully",
        issue: {
          id: 502,
          order_id: 101,
          product_id: 1,
          substitute_product_id: 99,
          reason: "out_of_stock",
          resolved: false,
          created_at: "2026-04-12T10:05:00Z",
        },
      });

      expect(service.warehouseDeps.applySubstitution.calledOnce).to.equal(true);
      expect(service.warehouseDeps.insertManagementAlert.calledOnce).to.equal(true);
    });
  });

  describe("resolvePickerIssue", () => {
    it("should throw if issueId is missing", async () => {
      try {
        await service.resolvePickerIssue();
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("issueId is required");
      }
    });

    it("should throw if the issue does not exist", async () => {
      sinon.stub(service.warehouseDeps, "resolvePickerIssue").resolves(null);

      try {
        await service.resolvePickerIssue(5);
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("Issue not found");
      }
    });

    it("should resolve the issue successfully", async () => {
      sinon.stub(service.warehouseDeps, "resolvePickerIssue").resolves({
        id: 601,
        order_id: 101,
        product_id: 1,
        substitute_product_id: null,
        reason: "missing",
        resolved: true,
        resolved_at: "2026-04-12T10:15:00Z",
      });

      sinon.stub(service.warehouseDeps, "resolveManagementAlertsForIssue").resolves([
        {
          id: 1,
          issue_id: 601,
          resolved: true,
        },
      ]);

      const result = await service.resolvePickerIssue(601);

      expect(result).to.deep.equal({
        message: "Issue resolved successfully",
        issue: {
          id: 601,
          order_id: 101,
          product_id: 1,
          substitute_product_id: null,
          reason: "missing",
          resolved: true,
          resolved_at: "2026-04-12T10:15:00Z",
        },
      });

      expect(service.warehouseDeps.resolveManagementAlertsForIssue.calledOnce).to.equal(true);
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
      try {
        await service.updateInventory(null, { quantity: 2, locationCode: "A-12" });
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("productId is required");
      }
    });

    it("should throw if quantity is invalid", async () => {
      try {
        await service.updateInventory(1, { quantity: "abc", locationCode: "A-12" });
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("Quantity must be a non-negative number");
      }
    });

    it("should throw if quantity is negative", async () => {
      try {
        await service.updateInventory(1, { quantity: -1, locationCode: "A-12" });
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("Quantity must be a non-negative number");
      }
    });

    it("should throw if location code is missing", async () => {
      try {
        await service.updateInventory(1, { quantity: 2, locationCode: "" });
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("Location code is required");
      }
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

  describe("finaliseOrder", () => {
    it("should throw if orderId is missing", async () => {
      try {
        await service.finaliseOrder();
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("orderId is required");
      }
    });

    it("should throw if unresolved stock issues exist", async () => {
      sinon.stub(service.warehouseDeps, "countUnresolvedIssuesForOrder").resolves(1);

      try {
        await service.finaliseOrder(101);
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal(
          "Order cannot be finalised while unresolved stock issues exist"
        );
      }
    });

    it("should throw if there are still unpicked items", async () => {
      sinon.stub(service.warehouseDeps, "countUnresolvedIssuesForOrder").resolves(0);
      sinon.stub(service.warehouseDeps, "countUnpickedItemsForOrder").resolves(2);

      try {
        await service.finaliseOrder(101);
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal(
          "Order cannot be finalised until all items are picked"
        );
      }
    });

    it("should throw if order is not found", async () => {
      sinon.stub(service.warehouseDeps, "countUnresolvedIssuesForOrder").resolves(0);
      sinon.stub(service.warehouseDeps, "countUnpickedItemsForOrder").resolves(0);
      sinon.stub(service.warehouseDeps, "finalisePickerOrder").resolves(null);

      try {
        await service.finaliseOrder(101);
        throw new Error("Expected method to throw.");
      } catch (error) {
        expect(error.message).to.equal("Order not found");
      }
    });

    it("should finalise order successfully", async () => {
      sinon.stub(service.warehouseDeps, "countUnresolvedIssuesForOrder").resolves(0);
      sinon.stub(service.warehouseDeps, "countUnpickedItemsForOrder").resolves(0);
      sinon.stub(service.warehouseDeps, "finalisePickerOrder").resolves({
        id: 101,
        status: "picked",
      });

      const result = await service.finaliseOrder(101);

      expect(result).to.deep.equal({
        message: "Order finalised successfully",
        order: {
          id: 101,
          status: "picked",
        },
      });
    });
  });

  describe("real-time update state changes", () => {
    it("should return updated location and stock in picker data after inventory changes", async () => {
      sinon.stub(service.warehouseDeps, "getPickerOrdersRows").resolves([
        {
          order_id: 101,
          order_status: "picking",
          product_id: 1,
          quantity: 1,
          picked: false,
          picked_at: null,
          substituted_product_id: null,
          product_name: "Milk",
          product_description: "Fresh milk",
          category_name: "Fresh Food",
          location_code: "C-08",
          stock_quantity: 14,
          customer_name: "Alice Smith",
          item_count: 1,
          substituted_product_name: null,
          issue_id: null,
          issue_reason: null,
          issue_resolved: null,
          issue_substitute_product_id: null,
          issue_created_at: null,
        },
      ]);

      sinon.stub(service.warehouseDeps, "getSubstituteProducts").resolves([]);

      const result = await service.getPickerOrders();

      expect(result).to.have.lengthOf(1);
      expect(result[0].items).to.have.lengthOf(1);
      expect(result[0].items[0].location_code).to.equal("C-08");
      expect(result[0].items[0].stock_quantity).to.equal(14);
    });

    it("should include an open issue in picker data after a stock issue is reported", async () => {
      sinon.stub(service.warehouseDeps, "getPickerOrdersRows").resolves([
        {
          order_id: 101,
          order_status: "picking",
          product_id: 1,
          quantity: 1,
          picked: false,
          picked_at: null,
          substituted_product_id: null,
          product_name: "Milk",
          product_description: "Fresh milk",
          category_name: "Fresh Food",
          location_code: "F-12",
          stock_quantity: 19,
          customer_name: "Alice Smith",
          item_count: 1,
          substituted_product_name: null,
          issue_id: 88,
          issue_reason: "out_of_stock",
          issue_resolved: false,
          issue_substitute_product_id: null,
          issue_created_at: "2026-04-14T10:00:00Z",
        },
      ]);

      sinon.stub(service.warehouseDeps, "getSubstituteProducts").resolves([]);

      const result = await service.getPickerOrders();

      expect(result[0].items[0].issue).to.deep.equal({
        id: 88,
        reason: "out_of_stock",
        resolved: false,
        substitute_product_id: null,
        created_at: "2026-04-14T10:00:00Z",
      });

      expect(result[0].hasUnresolvedIssues).to.equal(true);
    });

    it("should include a resolved issue in picker data after the issue is resolved", async () => {
      sinon.stub(service.warehouseDeps, "getPickerOrdersRows").resolves([
        {
          order_id: 101,
          order_status: "picking",
          product_id: 1,
          quantity: 1,
          picked: false,
          picked_at: null,
          substituted_product_id: null,
          product_name: "Milk",
          product_description: "Fresh milk",
          category_name: "Fresh Food",
          location_code: "F-12",
          stock_quantity: 19,
          customer_name: "Alice Smith",
          item_count: 1,
          substituted_product_name: null,
          issue_id: 88,
          issue_reason: "out_of_stock",
          issue_resolved: true,
          issue_substitute_product_id: null,
          issue_created_at: "2026-04-14T10:00:00Z",
        },
      ]);

      sinon.stub(service.warehouseDeps, "getSubstituteProducts").resolves([]);

      const result = await service.getPickerOrders();

      expect(result[0].items[0].issue).to.deep.equal({
        id: 88,
        reason: "out_of_stock",
        resolved: true,
        substitute_product_id: null,
        created_at: "2026-04-14T10:00:00Z",
      });

      expect(result[0].hasUnresolvedIssues).to.equal(false);
    });
  });
});