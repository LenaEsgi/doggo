import { MissionStepUsageGateway } from '#app/modules/actions/domain/contracts/mission-step-usage.gateway'
import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'

export class MissionStepUsageGatewayImplementation implements MissionStepUsageGateway {
  async isActionUsed(actionId: string): Promise<boolean> {
    const step = await MissionStepModel.query().where('actionId', actionId).first()
    return step !== null
  }
}
