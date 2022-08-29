import { ServiceBroker } from "@service-broker/service-broker-client";
export interface Job {
    jobInfo: unknown;
    touch: () => void;
    destroy: () => void;
    onDestroy: (cb: () => void) => void;
}
export declare class Worker {
    private name;
    private sb;
    private logger;
    private createJob;
    private jobs;
    private subs;
    constructor(name: string, sb: ServiceBroker, logger: Console, createJob: (jobId: string, jobArgs: any) => Job);
    private handle;
    private handleCreate;
    private handleDestroy;
    private handleExists;
    private handleSubscribe;
    private publish;
}
