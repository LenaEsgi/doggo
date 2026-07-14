import { Queue } from 'bullmq'
import {
  type MissionScheduleDispatchPayload,
  MissionScheduleDispatchQueue,
} from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'

export const MISSION_SCHEDULE_DISPATCH_QUEUE_NAME = 'mission-schedule-dispatch'

export class BullMqMissionScheduleDispatchQueue extends MissionScheduleDispatchQueue {
  private readonly queue: Queue

  constructor(connection: { host: string; port: number }) {
    super()
    this.queue = new Queue(MISSION_SCHEDULE_DISPATCH_QUEUE_NAME, { connection })
  }

  async enqueue(payload: MissionScheduleDispatchPayload): Promise<void> {
    await this.queue.add('dispatch-mission-schedule', payload)
  }
}
