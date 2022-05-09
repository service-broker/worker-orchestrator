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
        this.subs = new Set();
        sb.advertise({ name: `#${name}-worker` }, msg => this.handle(msg))
            .catch(logger.error);
        sb.notify({ name: `#${name}-orchestrator` }, {
            payload: JSON.stringify({
                method: "register"
            })
        })
            .catch(logger.error);
    }
    handle(msg) {
        const args = msg.header.method ? msg.header : JSON.parse(msg.payload);
        if (args.method == "create")
            return this.handleCreate(args.jobId, args.jobArgs);
        else if (args.method == "destroy")
            return this.handleDestroy(args.jobId);
        else if (args.method == "exists")
            return this.handleExists(args.jobId);
        else if (args.method == "subscribe")
            return this.handleSubscribe(msg.header.from);
        else
            throw new Error("Unknown method");
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
        return {
            payload: JSON.stringify({
                exists: this.jobs.has(jobId)
            })
        };
    }
    handleSubscribe(endpointId) {
        if (this.subs.has(endpointId)) {
        }
        else {
            this.subs.add(endpointId);
            this.sb.waitEndpoint(endpointId)
                .catch(this.logger.error)
                .finally(() => this.subs.delete(endpointId));
        }
        return {
            payload: JSON.stringify({
                jobs: Array.from(this.jobs.entries())
                    .map(([jobId, job]) => ({ jobId, jobInfo: job.jobInfo }))
            })
        };
    }
    publish(update) {
        const msg = {
            payload: JSON.stringify(update)
        };
        this.subs.forEach(sub => {
            this.sb.notifyTo(sub, `#${this.name}-orchestrator`, msg)
                .catch(this.logger.error);
        });
    }
}
exports.Worker = Worker;
