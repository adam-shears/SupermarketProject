import { expect } from 'chai';
import sinon from 'sinon';
import * as service from '../src/service.js';

describe("Catalogue Service", () => {
    afterEach(() => sinon.restore());

    describe("toDiscount", () => {
        it("should return null if there's no discount", () => {
            const result = service.catalogueDeps.toDiscount({
                discount_id: null,
                discount_code: null,
                discount_name: null,
                discount_type: null,
                discount_value: null,
            });

            expect(result).to.be.null;
        });

        it("should correctly transform a row to a discount object", () => {
            const result = service.catalogueDeps.toDiscount({
                discount_id: 1,
                discount_code: "SAVE10",
                discount_name: "Save 10%",
                discount_type: "percentage",
                discount_value: 10,
            });

            expect(result).to.deep.equal({
                id: 1,
                code: "SAVE10",
                name: "Save 10%",
                type: "percentage",
                value: 10,
            });
        });
    });

    describe("mergeProductRows", () => {
        it("should merge rows with the same product id and combine discounts", () => {
            const rows = [
                {id: 1, name: "Product A", description: "Desc A", category_name: "Category 1", price_pence: 1000, discount_id: 1, discount_code: "SAVE10", discount_name: "Save 10%", discount_type: "percentage", discount_value: 10},
                {id: 1, name: "Product A", description: "Desc A", category_name: "Category 1", price_pence: 1000, discount_id: 2, discount_code: "SAVE5", discount_name: "Save 5%", discount_type: "percentage", discount_value: 5},
                {id: 2, name: "Product B", description: "Desc B", category_name: "Category 2", price_pence: 2000, discount_id: null, discount_code: null, discount_name: null, discount_type: null, discount_value: null},
            ];

            const result = service.catalogueDeps.mergeProductRows(rows);

            expect(result).to.deep.equal([
                {
                    id: 1,
                    name: "Product A",
                    description: "Desc A",
                    category_name: "Category 1",
                    price_pence: 1000,
                    discounts: [
                        {id: 1, code: "SAVE10", name: "Save 10%", type: "percentage", value: 10},
                        {id: 2, code: "SAVE5", name: "Save 5%", type: "percentage", value: 5},
                    ],
                },
                {
                    id: 2,
                    name: "Product B",
                    description: "Desc B",
                    category_name: "Category 2",
                    price_pence: 2000,
                    discounts: [],
                },
            ]);
        });

        it("should return an empty array if no rows are provided", () => {
            const result = service.catalogueDeps.mergeProductRows([]);
            expect(result).to.deep.equal([]);
        });
    });

    describe("getProductsByCategoryWithDiscounts", async () => {
        it("should return a JSON object with an array of products grouped by category", async () => {
            const mockData = [
                {id: 1, name: "Product A", description: "Desc A", category_name: "Category 1", price_pence: 1000, discount_id: null, discount_code: null, discount_name: null, discount_type: null, discount_value: null},
                {id: 2, name: "Product B", description: "Desc B", category_name: "Category 1", price_pence: 1500, discount_id: null, discount_code: null, discount_name: null, discount_type: null, discount_value: null},
                {id: 3, name: "Product C", description: "Desc C", category_name: "Category 2", price_pence: 2000, discount_id: null, discount_code: null, discount_name: null, discount_type: null, discount_value: null},
            ];

            sinon.stub(service.catalogueDeps, 'selectListedProductsWithDiscountRows').resolves(mockData);
            const result = await service.getProductsByCategoryWithDiscounts();

            expect(result).to.deep.equal({
                "Category 1": [
                    {"id": 1, "name": "Product A"},
                    {"id": 2, "name": "Product B"}
                ],
                "Category 2": [
                    {"id": 3, "name": "Product C"}
                ]
            });
        });
    });

    describe("getActiveDeals", async () => {
        it("should return only active deals when includeExpired is false", async () => {
            const now = new Date();
            const mockData = [
                {id: 1, code: "IMACTIVE", discount_name: "Deal 1 is a real and active deal", type: "percentage", value: 10, starts_at: new Date(now.getTime() - 10000), ends_at: new Date(now.getTime() + 10000), product_id: 1, product_name: "Real product"},
                {id: 2, code: "IMNOTACTIVE", discount_name: "Deal 2 is not an active deal", type: "fixed", value: 5, starts_at: new Date(now.getTime() - 20000), ends_at: new Date(now.getTime() - 10000), product_id: 2, product_name: "Real product 2"},
            ];

            sinon.stub(service.catalogueDeps, 'selectDealRows').resolves(mockData);
            const result = await service.getActiveDeals(false);

            expect(result).to.deep.equal([
                {id: 1, code: "IMACTIVE", discount_name: "Deal 1 is a real and active deal", type: "percentage", value: 10, starts_at: new Date(now.getTime() - 10000), ends_at: new Date(now.getTime() + 10000), product_id: 1, product_name: "Real product"},
            ]);
        });

        it("should return all deals when includeExpired is true and transform them", async () => {
            const now = new Date();
            const mockData = [
                {discount_id: 1, code: "IMACTIVE", discount_name: "Deal 1 is a real and active deal", type: "percentage", value: 10, starts_at: new Date(now.getTime() - 10000), ends_at: new Date(now.getTime() + 10000), product_id: 1, product_name: "Real product"},
                {discount_id: 2, code: "IMNOTACTIVE", discount_name: "Deal 2 is not an active deal", type: "fixed", value: 5, starts_at: new Date(now.getTime() - 20000), ends_at: new Date(now.getTime() - 10000), product_id: 2, product_name: "Real product 2"},
            ];

            sinon.stub(service.catalogueDeps, 'selectDealRows').resolves(mockData);
            const result = await service.getActiveDeals(true);

            expect(result).to.deep.equal([
                {id: 1, code: "IMACTIVE", name: "Deal 1 is a real and active deal", type: "percentage", value: 10, products: [{id: 1, name: "Real product"}], startDate: new Date(now.getTime() - 10000), endDate: new Date(now.getTime() + 10000)},
                {id: 2, code: "IMNOTACTIVE", name: "Deal 2 is not an active deal", type: "fixed", value: 5, products: [{id: 2, name: "Real product 2"}], startDate: new Date(now.getTime() - 20000), endDate: new Date(now.getTime() - 10000)},
            ]);
        });
    });
});
