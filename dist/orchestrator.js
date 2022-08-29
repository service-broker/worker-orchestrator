"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
class Orchestrator {
    constructor(name, sb, logger) {
        this.name = name;
        this.sb = sb;
        this.logger = logger;
        this.workers = new Map();
        sb.advertise({ name: `#${name}-orchestrator` }, msg => this.handle(msg))
            .catch(logger.error);
        sb.notify({ name: `#${name}-worker` }, { header: { method: "subscribe" } })
            .catch(logger.error);
    }
    handle(msg) {
        const args = msg.header.method ? msg.header : JSON.parse(msg.payload);
        if (args.method == "register")
            return this.handleRegister(msg.header.from);
        else if (args.method == "onCreate")
            return this.handleOnCreate(msg.header.from, args.jobId, args.jobInfo);
        else if (args.method == "onDestroy")
            return this.handleOnDestroy(msg.header.from, args.jobId);
        else if (args.method == "onAvailability")
            return this.handleOnAvailability(msg.header.from, args.available);
        else
            throw new Error("Unknown method");
    }
    async handleRegister(endpointId) {
        if (this.workers.has(endpointId)) {
        }
        else {
            const res = await this.sb.requestTo(endpointId, `#${this.name}-worker`, {
                payload: JSON.stringify({
                    method: "subscribe"
                })
            });
            const { jobs } = JSON.parse(res.payload);
            this.workers.set(endpointId, {
                endpointId,
                jobs: jobs.reduce((acc, { jobId, jobInfo }) => acc.set(jobId, jobInfo), new Map()),
                available: 0
            });
            this.sb.waitEndpoint(endpointId)
                .catch(this.logger.error)
                .finally(() => this.workers.delete(endpointId));
        }
    }
    handleOnCreate(endpointId, jobId, jobInfo) {
        const worker = this.workers.get(endpointId);
        if (worker) {
            worker.jobs.set(jobId, Promise.resolve(jobInfo));
        }
        else {
            throw new Error("Worker does not exist");
        }
    }
    handleOnDestroy(endpointId, jobId) {
        const worker = this.workers.get(endpointId);
        if (worker) {
            worker.jobs.delete(jobId);
        }
        else {
            throw new Error("Worker does not exist");
        }
    }
    handleOnAvailability(endpointId, available) {
        const worker = this.workers.get(endpointId);
        if (worker) {
            worker.available = available;
        }
        else {
            throw new Error("Worker does not exist");
        }
    }
    createJob(jobId, jobArgs) {
        if (this.workers.size == 0) {
            throw new Error("No workers available");
        }
        for (const worker of this.workers.values()) {
            const promise = worker.jobs.get(jobId);
            if (promise)
                return promise;
        }
        let candidates = [];
        for (const worker of this.workers.values()) {
            if (candidates.length == 0 || worker.available == candidates[0].available)
                candidates.push(worker);
            else if (worker.available > candidates[0].available)
                candidates = [worker];
        }
        const worker = candidates[Math.floor(Math.random() * candidates.length)];
        const promise = this.sb.requestTo(worker.endpointId, `#${this.name}-worker`, {
            payload: JSON.stringify({
                method: "create",
                jobId,
                jobArgs
            })
        })
            .then(res => JSON.parse(res.payload).jobInfo);
        worker.jobs.set(jobId, promise);
        return promise;
    }
}
exports.Orchestrator = Orchestrator;
