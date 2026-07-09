import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'

export class FakeMissionTimeoutQueue extends MissionTimeoutQueue {
  public scheduled: Array<{ runId: string; dogId: string; delayMs: number }> = []
  public cancelled: string[] = []

  async schedule(runId: string, dogId: string, delayMs: number): Promise<void> {
    this.scheduled.push({ runId, dogId, delayMs })
  }

  async cancel(runId: string): Promise<void> {
    this.cancelled.push(runId)
  }
}
