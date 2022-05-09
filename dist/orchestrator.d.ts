import { ServiceBroker } from "@service-broker/service-broker-client";
export declare class Orchestrator<JobInfo> {
    private name;
    private sb;
    private logger;
    private workers;
    constructor(name: string, sb: ServiceBroker, logger: Console);
    private handle;
    private handleRegister;
    private handleOnCreate;
    private handleOnDestroy;
    private handleOnAvailability;
    createJob(jobId: string, jobArgs: any): Promise<JobInfo>;
}
