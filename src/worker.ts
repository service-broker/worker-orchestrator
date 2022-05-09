import { Message, MessageWithHeader, ServiceBroker } from "@service-broker/service-broker-client"

interface Job {
  jobInfo: unknown
  destroy: () => void
  onDestroy: (cb: () => void) => void
}


export class Worker {
  private jobs = new Map<string, Job>()
  private subs = new Set<string>()

  constructor(private name: string, private sb: ServiceBroker, private logger: Console, private createJob: (jobId: string, jobArgs: any) => Job) {
    sb.advertise({name: `#${name}-worker`}, msg => this.handle(msg))
      .catch(logger.error)
    sb.notify({name: `#${name}-orchestrator`}, {
      payload: JSON.stringify({
        method: "register"
      })
    })
      .catch(logger.error)
  }

  private handle(msg: MessageWithHeader) {
    const args = msg.header.method ? msg.header : JSON.parse(<string>msg.payload)
    if (args.method == "create") return this.handleCreate(args.jobId, args.jobArgs)
    else if (args.method == "destroy") return this.handleDestroy(args.jobId)
    else if (args.method == "exists") return this.handleExists(args.jobId)
    else if (args.method == "subscribe") return this.handleSubscribe(msg.header.from)
    else throw new Error("Unknown method")
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
    return {
      payload: JSON.stringify({
        exists: this.jobs.has(jobId)
      })
    }
  }

  private handleSubscribe(endpointId: string): Message {
    if (this.subs.has(endpointId)) {
    }
    else {
      this.subs.add(endpointId)
      this.sb.waitEndpoint(endpointId)
        .catch(this.logger.error)
        .finally(() => this.subs.delete(endpointId))
    }
    return {
      payload: JSON.stringify({
        jobs: Array.from(this.jobs.entries())
          .map(([jobId, job]) => ({jobId, jobInfo: job.jobInfo}))
      })
    }
  }

  private publish(update: unknown) {
    const msg = {
      payload: JSON.stringify(update)
    }
    this.subs.forEach(sub => {
      this.sb.notifyTo(sub, `#${this.name}-orchestrator`, msg)
        .catch(this.logger.error)
    })
  }
}
