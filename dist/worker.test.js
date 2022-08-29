"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jest-expect-json");
const test_util_1 = require("./test-util");
const worker_1 = require("./worker");
const mockJobs = new Map();
function createJob(jobId, jobArgs) {
    const job = {
        jobInfo: { jobId, jobArgs },
        touch: jest.fn(),
        destroy: jest.fn(),
        onDestroy: jest.fn(),
    };
    mockJobs.set(jobId, job);
    return job;
}
test("main", async () => {
    const sb = (0, test_util_1.mockServiceBroker)();
    sb.advertise.mockResolvedValue(undefined);
    sb.notify.mockResolvedValue(undefined);
    sb.notifyTo.mockResolvedValue(undefined);
    sb.waitEndpoint.mockResolvedValue(undefined);
    const worker = new worker_1.Worker("test", sb, console, createJob);
    expect(sb.advertise.mock.calls.length).toBe(1);
    expect(sb.advertise.mock.calls[0]).toEqual([
        { name: "#test-worker" },
        expect.any(Function)
    ]);
    expect(sb.setServiceHandler.mock.calls.length).toBe(1);
    expect(sb.setServiceHandler.mock.calls[0]).toEqual([
        "test-worker",
        expect.any(Function)
    ]);
    expect(sb.notify.mock.calls.length).toBe(1);
    expect(sb.notify.mock.calls[0]).toEqual([
        { name: "#test-orchestrator" },
        { header: { method: "workerCheckIn" } }
    ]);
    const handleBroadcast = sb.advertise.mock.calls[0][1];
    const handleRequest = sb.setServiceHandler.mock.calls[0][1];
    //orchestrator check in
    handleBroadcast({ header: { from: "orc1", method: "orchestratorCheckIn" } });
    expect(sb.notifyTo.mock.calls.length).toBe(1);
    expect(sb.notifyTo.mock.calls[0]).toEqual([
        "orc1",
        "#test-orchestrator",
        { header: { method: "workerCheckIn" } }
    ]);
    //list jobs
    let res = handleRequest({ header: { method: "list" } });
    expect(res.payload).jsonMatching([]);
    //create job
    let jobId = "job1", jobArgs = { a: 1 }, jobInfo = { jobId, jobArgs };
    res = handleRequest({ header: { method: "create", jobId, jobArgs } });
    expect(res.payload).jsonMatching({ jobInfo });
    const job = mockJobs.get(jobId);
    expect(job).toBeDefined();
    expect(job.onDestroy.mock.calls.length).toBe(1);
    expect(job.onDestroy.mock.calls[0]).toEqual([expect.any(Function)]);
    const onDestroy = job.onDestroy.mock.calls[0][0];
    expect(sb.notify.mock.calls.length).toBe(2);
    expect(sb.notify.mock.calls[1]).toEqual([
        { name: "#test-orchestrator" },
        { payload: expect.jsonMatching({ method: "onCreate", jobId, jobInfo }) }
    ]);
    //exists job
    res = handleRequest({ header: { method: "exists", jobId } });
    expect(res.payload).jsonMatching({ exists: true });
    expect(job.touch.mock.calls.length).toBe(1);
    //destroy job
    res = handleRequest({ header: { method: "destroy", jobId } });
    expect(job.destroy.mock.calls.length).toBe(1);
    expect(job.destroy.mock.calls[0]).toEqual([]);
    onDestroy();
    expect(sb.notify.mock.calls.length).toBe(3);
    expect(sb.notify.mock.calls[2]).toEqual([
        { name: "#test-orchestrator" },
        { payload: expect.jsonMatching({ method: "onDestroy", jobId }) }
    ]);
    //exists job
    res = handleRequest({ header: { method: "exists", jobId } });
    expect(res.payload).jsonMatching({ exists: false });
});
