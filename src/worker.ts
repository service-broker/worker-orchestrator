import { Message, MessageWithHeader, ServiceBroker } from "@service-broker/service-broker-client"

export interface Job {
  jobInfo: unknown
  touch: () => void
  destroy: () => void
  onDestroy: (cb: () => void) => void
}


export class Worker {
  private jobs = new Map<string, Job>()

  constructor(private name: string, private sb: ServiceBroker, private logger: Console, private createJob: (jobId: string, jobArgs: any) => Job) {
    sb.advertise({name: `#${name}-worker`}, msg => this.handleBroadcast(msg))
      .catch(logger.error)
    sb.setServiceHandler(`${name}-worker`, msg => this.handleRequest(msg))
    sb.notify({name: `#${name}-orchestrator`}, {header: {method: "workerCheckIn"}})
      .catch(logger.error)
  }

  private handleBroadcast(msg: MessageWithHeader): void {
    const args = msg.header.method ? msg.header : JSON.parse(<string>msg.payload)
    if (args.method == "orchestratorCheckIn") this.handleOrchestratorCheckIn(msg.header.from)
    else throw new Error("Unknown method")
  }

  private handleRequest(msg: MessageWithHeader): Message|void {
    const args = msg.header.method ? msg.header : JSON.parse(<string>msg.payload)
    if (args.method == "list") return this.handleList()
    else if (args.method == "create") return this.handleCreate(args.jobId, args.jobArgs)
    else if (args.method == "destroy") return this.handleDestroy(args.jobId)
    else if (args.method == "exists") return this.handleExists(args.jobId)
    else throw new Error("Unknown method")
  }

  private handleOrchestratorCheckIn(endpointId: string): void {
    this.sb.notifyTo(endpointId, `#${this.name}-orchestrator`, {header: {method: "workerCheckIn"}})
      .catch(this.logger.error)
  }

  private handleList(): Message {
    const items = Array.from(this.jobs.entries())
      .map(([jobId, job]) => ({jobId, jobInfo: job.jobInfo}))
    return {
      payload: JSON.stringify(items)
    }
  }

  private handleCreate(jobId: string, jobArgs: any): Message {
    if (this.jobs.has(jobId)) {
      throw new Error("Job already exists")
    }
    else {
      const job = this.createJob(jobId, jobArgs)
      this.jobs.set(jobId, job)
      this.publish({
        method: "onCreate",
        jobId,
        jobInfo: job.jobInfo
      })
      job.onDestroy(() => {
        this.jobs.delete(jobId)
        this.publish({
          method: "onDestroy",
          jobId
        })
      })
      return {
        payload: JSON.stringify({
          jobInfo: job.jobInfo
        })
      }
    }
  }

  private handleDestroy(jobId: string): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.destroy()
    }
    else {
      throw new Error("Job does not exist")
    }
  }

  private handleExists(jobId: string): Message {
    const job = this.jobs.get(jobId)
    if (job) {
      job.touch()
    }
    return {
      payload: JSON.stringify({
        exists: !!job
      })
    }
  }

  private publish(update: unknown) {
    const payload = JSON.stringify(update)
    this.sb.notify({name: `#${this.name}-orchestrator`}, { payload })
      .catch(this.logger.error)
  }
}
