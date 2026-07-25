import { inject } from '@adonisjs/core'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { type MissionReportRequestPayload } from '#app/modules/missions/domain/contracts/mission-report-request-publisher'

@inject()
export class MissionReportPayloadBuilder {
  constructor(
    private readonly missionRunRepository: MissionRunRepository,
    private readonly missionRepository: MissionRepository,
    private readonly robotDogGateway: RobotDogGateway,
    private readonly actionRepository: ActionRepository
  ) {}

  async build(missionRunId: string, missionName: string): Promise<MissionReportRequestPayload | null> {
    const run = await this.missionRunRepository.findById(missionRunId)
    if (!run) return null

    const mission = await this.missionRepository.findById(MissionId.fromString(run.missionId.value))
    if (!mission) return null

    const dog = await this.robotDogGateway.findBy(RobotDogId.fromString(run.robotDogId.value))

    const steps = await Promise.all(
      run.runSteps
        .sort((a, b) => a.order - b.order)
        .map(async (runStep) => {
          const missionStep = mission.missionSteps.find((s) => s.id.equals(runStep.stepId))
          const action = missionStep
            ? await this.actionRepository.findById(ActionId.fromString(missionStep.actionId))
            : null

          return {
            name: action?.name ?? 'Étape inconnue',
            status: runStep.status,
            order: runStep.order,
          }
        })
    )

    return {
      missionRunId: run.id.value,
      missionName,
      robotDogName: dog?.name ?? 'Robot',
      status: run.status as 'SUCCESS' | 'FAILED',
      startedAt: run.startedAt.toISOString(),
      endedAt: run.endedAt ? run.endedAt.toISOString() : null,
      steps,
    }
  }
}
