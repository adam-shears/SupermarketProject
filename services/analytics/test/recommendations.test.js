// Unit tests for the recommendations module

import { expect } from "chai";
import sinon from "sinon";
import * as recommendations from "../src/recommendations.js";

describe("Analytics Service | Recommendations Module", () => {
  afterEach(() => sinon.restore());

  describe("filterRecommendations", () => {
    it("shouuld deduplicate candidate recommendations", () => {
      const candidates = [1, 2, 3, 4, 2, 2, 3];
      const constraints = {
        limit: 4,
        availableProducts: [1, 2, 3, 4],
      };

      const filtered = recommendations.filterRecommendations(candidates, constraints);
      expect(filtered).to.deep.equal([1, 2, 3, 4]);
    });

    it("should filter out the product currently being viewed", () => {
      const candidates = [1, 2, 3, 4];
      const constraints = {
        limit: 4,
        availableProducts: [1, 2, 3, 4],
        currentlyViewing: 2,
      };

      const filtered = recommendations.filterRecommendations(candidates, constraints);
      expect(filtered).to.deep.equal([1, 3, 4]);
    });

    it("should filter out products that are in the user's basket", () => {
      const candidates = [1, 2, 3, 4];
      const constraints = {
        limit: 4,
        availableProducts: [1, 2, 3, 4],
        productsInBasket: [3, 4],
      };

      const filtered = recommendations.filterRecommendations(candidates, constraints);
      expect(filtered).to.deep.equal([1, 2]);
    });

    it("should filter out products that are not available", () => {
      const candidates = [1, 2, 3, 4];
      const constraints = {
        limit: 4,
        availableProducts: [1, 2],
      };

      const filtered = recommendations.filterRecommendations(candidates, constraints);
      expect(filtered).to.deep.equal([1, 2]);
    });

    it("should enforce the limit on the number of recommendations it returns", () => {
      const candidates = [1, 2, 3, 4, 5, 6];
      const constraints = {
        limit: 4,
        availableProducts: [1, 2, 3, 4, 5, 6],
      };

      const filtered = recommendations.filterRecommendations(candidates, constraints);
      expect(filtered).to.deep.equal([1, 2, 3, 4]);
    });
  });

  describe("mergeRecommendations", () => {
    it("should enforce the limit on the number of recommendations it returns", async () => {
      const recommendationsLists = [
        [1, 2, 3], // from previous orders
        [4, 5, 6], // from frequently bought together
        [7, 8, 9], // trending within category
        [10, 11, 12], // generally popular
      ];

      const constraints = {
        limit: 4,
        availableProducts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      };

      const merged = await recommendations.mergeRecommendations(recommendationsLists, constraints);
      expect(merged).to.deep.equal([1, 2, 3, 4]);
    });

    it("should merge recommendation from the different sources with the correct priority", async () => {
      let recommendationsLists = [
        [1], // from previous orders
        [4, 5], // from frequently bought together
        [7, 8, 9], // trending within category
        [10, 11, 12], // generally popular
      ];

      const constraints = {
        limit: 4,
        availableProducts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      };

      const merged = await recommendations.mergeRecommendations(recommendationsLists, constraints);
      expect(merged).to.deep.equal([1, 4, 5, 7]);

      recommendationsLists = [
        [], // from previous orders
        [], // from frequently bought together
        [7, 8, 9], // trending within category
        [10, 11, 12], // generally popular
      ];

      const merged2 = await recommendations.mergeRecommendations(recommendationsLists, constraints);
      expect(merged2).to.deep.equal([7, 8, 9, 10]);
    });
  });
});
