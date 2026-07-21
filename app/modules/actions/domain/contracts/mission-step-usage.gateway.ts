export abstract class MissionStepUsageGateway {
  abstract isActionUsed(actionId: string): Promise<boolean>
}
