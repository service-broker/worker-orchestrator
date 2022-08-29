export declare function mockServiceBroker(): {
    advertise: jest.Mock<any, any>;
    setServiceHandler: jest.Mock<any, any>;
    requestTo: jest.Mock<any, any>;
    notify: jest.Mock<any, any>;
    notifyTo: jest.Mock<any, any>;
    waitEndpoint: jest.Mock<any, any>;
};
