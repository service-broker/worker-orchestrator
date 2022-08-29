
export function mockServiceBroker() {
  return {
    advertise: jest.fn(),
    setServiceHandler: jest.fn(),
    requestTo: jest.fn(),
    notify: jest.fn(),
    notifyTo: jest.fn(),
    waitEndpoint: jest.fn(),
  }
}
