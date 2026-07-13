import {
  type MissionScheduleDispatchPayload,
  MissionScheduleDispatchQueue,
} from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'

export class FakeMissionScheduleDispatchQueue extends MissionScheduleDispatchQueue {
  public enqueued: MissionScheduleDispatchPayload[] = []

  async enqueue(payload: MissionScheduleDispatchPayload): Promise<void> {
    this.enqueued.push(payload)
  }
}
