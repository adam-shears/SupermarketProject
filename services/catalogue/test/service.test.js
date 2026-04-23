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
                    "Product A",
                    "Product B",
                ],
                "Category 2": [
                    "Product C",
                ]
            });
        });
    });
});
