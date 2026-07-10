import { MissionRunStepId } from '#app/modules/missions/domain/value-objects/mission-run-step-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'

export default class MissionRunStep {
  private constructor(
    private readonly _id: MissionRunStepId,
    private readonly _stepId: MissionStepId,
    private _status: MissionStepStatus,
    private readonly _order: number
  ) {}

  static create(stepId: MissionStepId, order: number): MissionRunStep {
    return new MissionRunStep(MissionRunStepId.generate(), stepId, MissionStepStatus.PENDING, order)
  }

  static rehydrate(
    id: string,
    stepId: string,
    status: MissionStepStatus,
    order: number
  ): MissionRunStep {
    return new MissionRunStep(
      MissionRunStepId.fromString(id),
      MissionStepId.fromString(stepId),
      status,
      order
    )
  }

  complete(): void {
    if (this._status === MissionStepStatus.PENDING) {
      this._status = MissionStepStatus.COMPLETED
    }
  }

  fail(): void {
    if (this._status === MissionStepStatus.PENDING) {
      this._status = MissionStepStatus.FAILED
    }
  }

  get id(): MissionRunStepId {
    return this._id
  }

  get stepId(): MissionStepId {
    return this._stepId
  }

  get status(): MissionStepStatus {
    return this._status
  }

  get order(): number {
    return this._order
  }
}
