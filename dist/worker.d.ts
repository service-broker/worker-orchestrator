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
    constructor(name: string, sb: ServiceBroker, logger: Console, createJob: (jobId: string, jobArgs: any) => Job);
    private handleBroadcast;
    private handleRequest;
    private handleOrchestratorCheckIn;
    private handleList;
    private handleCreate;
    private handleDestroy;
    private handleExists;
    private publish;
}
