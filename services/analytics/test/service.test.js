import { expect } from 'chai';
import sinon from 'sinon';
import * as service from '../src/service.js';

describe("Analytics Service", () => {
    afterEach(() => sinon.restore());

    describe("getManagementData", () => {
        it("should error when an invalid scale is provided", async () => {
            await expect(service.getManagementData('invalidScale')).to.be.rejectedWith(Error, "Invalid scale. Must be day, week, or month.");
        });

        it("should call all dependencies with the correct scale", async () => {
            const stubTotalSales = sinon.stub(service.analyticsDeps, "getTotalSales").resolves(10000);
            const stubBestSellers = sinon.stub(service.analyticsDeps, "getBestSellers").resolves([]);
            const stubSalesPerCategory = sinon.stub(service.analyticsDeps, "getSalesPerCategory").resolves([]);
            const stubTrendingItems = sinon.stub(service.analyticsDeps, "getTrendingItems").resolves([]);

            await service.getManagementData('week');

            expect(stubTotalSales.calledWith('week')).to.be.true;
            expect(stubBestSellers.calledWith('week')).to.be.true;
            expect(stubSalesPerCategory.calledWith('week')).to.be.true;
            expect(stubTrendingItems.calledWith('week')).to.be.true;
        });
    });
});
