import { type MissionStepUsageGateway } from '#app/modules/actions/domain/contracts/mission-step-usage.gateway'

export class FakeMissionStepUsageGateway implements MissionStepUsageGateway {
  public usedActionIds: Set<string> = new Set()

  async isActionUsed(actionId: string): Promise<boolean> {
    return this.usedActionIds.has(actionId)
  }
}
