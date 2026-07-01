import { MissionRunId } from '#app/modules/missions/domain/value-objects/mission-run-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'

export default class MissionRun {
  private constructor(
    private readonly _id: MissionRunId,
    private readonly _missionId: MissionId,
    private readonly _robotDogId: RobotDogId,
    private _status: MissionRunStatus,
    private readonly _runSteps: MissionRunStep[],
    private readonly _startedAt: Date,
    private _endedAt: Date | null
  ) {}

  static start(missionId: MissionId, robotDogId: RobotDogId, stepIds: MissionStepId[]): MissionRun {
    return new MissionRun(
      MissionRunId.generate(),
      missionId,
      robotDogId,
      MissionRunStatus.RUNNING,
      stepIds.map((stepId) => MissionRunStep.create(stepId)),
      new Date(),
      null
    )
  }

  static rehydrate(
    id: string,
    missionId: string,
    robotDogId: string,
    status: MissionRunStatus,
    runSteps: MissionRunStep[],
    startedAt: Date,
    endedAt: Date | null
  ): MissionRun {
    return new MissionRun(
      MissionRunId.fromString(id),
      MissionId.fromString(missionId),
      RobotDogId.fromString(robotDogId),
      status,
      runSteps,
      startedAt,
      endedAt
    )
  }

  completeStep(stepId: MissionStepId): void {
    this.ensureRunning()
    this.findRunStep(stepId).complete()
    this.recomputeStatus()
  }

  failStep(stepId: MissionStepId): void {
    this.ensureRunning()
    this.findRunStep(stepId).fail()
    this.recomputeStatus()
  }

  interrupt(): void {
    this.ensureRunning()
    this._status = MissionRunStatus.INTERRUPTED
    this._endedAt = new Date()
  }

  private recomputeStatus(): void {
    const allCompleted = this._runSteps.every((s) => s.status === MissionStepStatus.COMPLETED)
    const anyFailed = this._runSteps.some((s) => s.status === MissionStepStatus.FAILED)

    if (allCompleted) {
      this._status = MissionRunStatus.SUCCESS
      this._endedAt = new Date()
    } else if (anyFailed) {
      this._status = MissionRunStatus.FAILED
      this._endedAt = new Date()
    }
  }

  private findRunStep(stepId: MissionStepId): MissionRunStep {
    const runStep = this._runSteps.find((s) => s.stepId.equals(stepId))
    if (!runStep) {
      throw new InvalidMissionStepNotFoundError(stepId)
    }
    return runStep
  }

  private ensureRunning(): void {
    if (this._status !== MissionRunStatus.RUNNING) {
      throw new NoActiveMissionRunError(this._robotDogId.value)
    }
  }

  get id(): MissionRunId {
    return this._id
  }

  get missionId(): MissionId {
    return this._missionId
  }

  get robotDogId(): RobotDogId {
    return this._robotDogId
  }

  get status(): MissionRunStatus {
    return this._status
  }

  get runSteps(): MissionRunStep[] {
    return [...this._runSteps]
  }

  get startedAt(): Date {
    return this._startedAt
  }

  get endedAt(): Date | null {
    return this._endedAt
  }

  get isTerminal(): boolean {
    return this._status !== MissionRunStatus.RUNNING
  }
}
