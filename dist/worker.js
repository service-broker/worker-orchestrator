"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
class Worker {
    constructor(name, sb, logger, createJob) {
        this.name = name;
        this.sb = sb;
        this.logger = logger;
        this.createJob = createJob;
        this.jobs = new Map();
        sb.advertise({ name: `#${name}-worker` }, msg => this.handleBroadcast(msg))
            .catch(logger.error);
        sb.setServiceHandler(`${name}-worker`, msg => this.handleRequest(msg));
        sb.notify({ name: `#${name}-orchestrator` }, { header: { method: "workerCheckIn" } })
            .catch(logger.error);
    }
    handleBroadcast(msg) {
        const args = msg.header.method ? msg.header : JSON.parse(msg.payload);
        if (args.method == "orchestratorCheckIn")
            this.handleOrchestratorCheckIn(msg.header.from);
        else
            throw new Error("Unknown method");
    }
    handleRequest(msg) {
        const args = msg.header.method ? msg.header : JSON.parse(msg.payload);
        if (args.method == "list")
            return this.handleList();
        else if (args.method == "create")
            return this.handleCreate(args.jobId, args.jobArgs);
        else if (args.method == "destroy")
            return this.handleDestroy(args.jobId);
        else if (args.method == "exists")
            return this.handleExists(args.jobId);
        else
            throw new Error("Unknown method");
    }
    handleOrchestratorCheckIn(endpointId) {
        this.sb.notifyTo(endpointId, `#${this.name}-orchestrator`, { header: { method: "workerCheckIn" } })
            .catch(this.logger.error);
    }
    handleList() {
        const items = Array.from(this.jobs.entries())
            .map(([jobId, job]) => ({ jobId, jobInfo: job.jobInfo }));
        return {
            payload: JSON.stringify(items)
        };
    }
    handleCreate(jobId, jobArgs) {
        if (this.jobs.has(jobId)) {
            throw new Error("Job already exists");
        }
        else {
            const job = this.createJob(jobId, jobArgs);
            this.jobs.set(jobId, job);
            this.publish({
                method: "onCreate",
                jobId,
                jobInfo: job.jobInfo
            });
            job.onDestroy(() => {
                this.jobs.delete(jobId);
                this.publish({
                    method: "onDestroy",
                    jobId
                });
            });
            return {
                payload: JSON.stringify({
                    jobInfo: job.jobInfo
                })
            };
        }
    }
    handleDestroy(jobId) {
        const job = this.jobs.get(jobId);
        if (job) {
            job.destroy();
        }
        else {
            throw new Error("Job does not exist");
        }
    }
    handleExists(jobId) {
        const job = this.jobs.get(jobId);
        if (job) {
            job.touch();
        }
        return {
            payload: JSON.stringify({
                exists: !!job
            })
        };
    }
    publish(update) {
        const payload = JSON.stringify(update);
        this.sb.notify({ name: `#${this.name}-orchestrator` }, { payload })
            .catch(this.logger.error);
    }
}
exports.Worker = Worker;
