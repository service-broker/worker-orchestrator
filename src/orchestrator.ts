import { MessageWithHeader, ServiceBroker } from "@service-broker/service-broker-client"

interface Worker<JobInfo> {
  endpointId: string
  jobs: Map<string, Promise<JobInfo>>
  available: number
}


export class Orchestrator<JobInfo> {
  private workers = new Map<string, Worker<JobInfo>>()

  constructor(private name: string, private sb: ServiceBroker, private logger: Console) {
    sb.advertise({name: `#${name}-orchestrator`}, msg => this.handleBroadcast(msg))
      .catch(logger.error)
    sb.notify({name: `#${name}-worker`}, {header: {method: "orchestratorCheckIn"}})
      .catch(logger.error)
  }

  private handleBroadcast(msg: MessageWithHeader): void|Promise<void> {
    const args = msg.header.method ? msg.header : JSON.parse(<string>msg.payload)
    if (args.method == "workerCheckIn") return this.handleWorkerCheckIn(msg.header.from)
    else if (args.method == "onCreate") return this.handleOnCreate(msg.header.from, args.jobId, args.jobInfo)
    else if (args.method == "onDestroy") return this.handleOnDestroy(msg.header.from, args.jobId)
    else if (args.method == "onAvailability") return this.handleOnAvailability(msg.header.from, args.available)
    else throw new Error("Unknown method")
  }

  private async handleWorkerCheckIn(endpointId: string) {
    if (this.workers.has(endpointId)) {
    }
    else {
      const res = await this.sb.requestTo(endpointId, `${this.name}-worker`, {
        header: {
          method: "list"
        }
      })
      const items = JSON.parse(<string>res.payload) as Array<{jobId: string, jobInfo: JobInfo}>
      this.workers.set(endpointId, {
        endpointId,
        jobs: items.reduce((acc, {jobId, jobInfo}) => acc.set(jobId, jobInfo), new Map()),
        available: 0
      })
      this.sb.waitEndpoint(endpointId)
        .catch(this.logger.error)
        .finally(() => this.workers.delete(endpointId))
    }
  }

  private handleOnCreate(endpointId: string, jobId: string, jobInfo: JobInfo): void {
    const worker = this.workers.get(endpointId)
    if (worker) {
      worker.jobs.set(jobId, Promise.resolve(jobInfo))
    }
    else {
      throw new Error("Worker does not exist")
    }
  }

  private handleOnDestroy(endpointId: string, jobId: string): void {
    const worker = this.workers.get(endpointId)
    if (worker) {
      worker.jobs.delete(jobId)
    }
    else {
      throw new Error("Worker does not exist")
    }
  }

  private handleOnAvailability(endpointId: string, available: number): void {
    const worker = this.workers.get(endpointId)
    if (worker) {
      worker.available = available
    }
    else {
      throw new Error("Worker does not exist")
    }
  }

  createJob(jobId: string, jobArgs: any): Promise<JobInfo> {
    if (this.workers.size == 0) {
      throw new Error("No workers available")
    }
    for (const worker of this.workers.values()) {
      const promise = worker.jobs.get(jobId)
      if (promise) return promise
    }
    let candidates: Worker<JobInfo>[] = []
    for (const worker of this.workers.values()) {
      if (candidates.length == 0 || worker.available == candidates[0].available) candidates.push(worker)
      else if (worker.available > candidates[0].available) candidates = [worker]
    }
    const worker = candidates[Math.floor(Math.random() * candidates.length)]
    const promise = this.sb.requestTo(worker.endpointId, `#${this.name}-worker`, {
      header: {
        method: "create",
        jobId,
        jobArgs
      }
    })
      .then(res => JSON.parse(<string>res.payload).jobInfo)
    worker.jobs.set(jobId, promise)
    return promise
  }
}
