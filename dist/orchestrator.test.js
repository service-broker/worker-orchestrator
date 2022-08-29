"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jest-expect-json");
const orchestrator_1 = require("./orchestrator");
const test_util_1 = require("./test-util");
test("main", async () => {
    const sb = (0, test_util_1.mockServiceBroker)();
    sb.advertise.mockResolvedValue(undefined);
    sb.notify.mockResolvedValue(undefined);
    sb.notifyTo.mockResolvedValue(undefined);
    sb.waitEndpoint.mockResolvedValue(undefined);
    const orchestrator = new orchestrator_1.Orchestrator("test", sb, console);
    expect(sb.advertise.mock.calls.length).toBe(1);
    expect(sb.advertise.mock.calls[0]).toEqual([
        { name: "#test-orchestrator" },
        expect.any(Function)
    ]);
    expect(sb.notify.mock.calls.length).toBe(1);
    expect(sb.notify.mock.calls[0]).toEqual([
        { name: "#test-worker" },
        { header: { method: "orchestratorCheckIn" } }
    ]);
    const handle = sb.advertise.mock.calls[0][1];
    //worker check in
    sb.requestTo.mockResolvedValueOnce({
        payload: JSON.stringify({
            jobs: [
                { jobId: 1, jobInfo: "job 1" }
            ]
        })
    });
    sb.waitEndpoint.mockReturnValue(jest.);
    handle({
        header: {
            from: "worker1",
            method: "workerCheckIn"
        }
    });
    expect(sb.requestTo.mock.calls.length).toBe(1);
    expect(sb.requestTo.mock.calls[0]).toEqual([
        "worker1",
        "#test-worker",
        { header: { method: "list" } }
    ]);
    expect(sb.waitEndpoint.mock.calls.length).toBe(1);
    expect(sb.waitEndpoint.mock.calls[0]).toEqual(["worker1"]);
    //onCreate
    handle({
        header: {
            from: "worker1",
            method: "onCreate",
            jobId: 2,
            jobInfo: "job 2"
        }
    });
});
