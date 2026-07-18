import { Queue } from 'bullmq'
import logger from '@adonisjs/core/services/logger'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'

export const MISSION_TIMEOUT_QUEUE_NAME = 'mission-timeouts'

export class BullMqMissionTimeoutQueue extends MissionTimeoutQueue {
  private readonly queue: Queue

  constructor(connection: { host: string; port: number; password?: string }) {
    super()
    this.queue = new Queue(MISSION_TIMEOUT_QUEUE_NAME, { connection })
  }

  // BullMQ rejects custom job ids containing ':' unless they have exactly 3 segments,
  // so we use '-' as the separator (uuid segments stay intact for lookup).
  private jobIdFor(runId: string): string {
    return `cancel-pending-${runId}`
  }

  async schedule(runId: string, dogId: string, delayMs: number): Promise<void> {
    await this.queue.add(
      'cancel-pending-run',
      { runId, dogId },
      { delay: delayMs, jobId: this.jobIdFor(runId) }
    )
  }

  async cancel(runId: string): Promise<void> {
    try {
      const job = await this.queue.getJob(this.jobIdFor(runId))
      await job?.remove()
    } catch (error) {
      // A job that is already being processed (active) cannot be removed and throws.
      // The timeout handler re-checks the run status, so a failed cancel is harmless.
      logger.warn(
        { runId, err: error },
        'BullMqMissionTimeoutQueue: cancel failed (job active or already gone)'
      )
    }
  }
}
