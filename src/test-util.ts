
export function mockServiceBroker() {
  return {
    advertise: jest.fn(),
    notify: jest.fn(),
    notifyTo: jest.fn(),
    waitEndpoint: jest.fn(),
  }
}
