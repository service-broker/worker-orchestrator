"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockServiceBroker = void 0;
function mockServiceBroker() {
    return {
        advertise: jest.fn(),
        setServiceHandler: jest.fn(),
        requestTo: jest.fn(),
        notify: jest.fn(),
        notifyTo: jest.fn(),
        waitEndpoint: jest.fn(),
    };
}
exports.mockServiceBroker = mockServiceBroker;
