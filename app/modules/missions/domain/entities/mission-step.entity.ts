import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { InvalidMissionStepOrderError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-order.error'
import { InvalidMissionStepTransitionError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-transition-error'

export default class MissionStep {
  constructor(
    private readonly _id: MissionStepId,
    private _actionId: string,
    private _sequenceOrder: number,
    private _parameters: string,
    private _status: MissionStepStatus
  ) {}

  static create(action: string, sequenceOrder: number, parameters: string) {
    if (sequenceOrder <= 0) {
      throw new InvalidMissionStepOrderError(sequenceOrder)
    }

    return new MissionStep(
      MissionStepId.generate(),
      action,
      sequenceOrder,
      parameters,
      MissionStepStatus.PENDING
    )
  }

  static rehydrate(
    id: string,
    action: string,
    sequenceOrder: number,
    parameters: string,
    status: MissionStepStatus
  ) {
    return new MissionStep(MissionStepId.fromString(id), action, sequenceOrder, parameters, status)
  }

  // -------------------
  // Business
  // -------------------

  public changeOrder(newOrder: number) {
    this._sequenceOrder = newOrder
  }

  markAsInPending() {
    if (this._status === MissionStepStatus.PENDING) {
      throw new InvalidMissionStepTransitionError()
    }

    this._status = MissionStepStatus.PENDING
  }

  complete() {
    if (this._status !== MissionStepStatus.PENDING) {
      throw new InvalidMissionStepTransitionError()
    }

    this._status = MissionStepStatus.COMPLETED
  }

  failed() {
    if (this._status !== MissionStepStatus.PENDING) {
      throw new InvalidMissionStepTransitionError()
    }

    this._status = MissionStepStatus.FAILED
  }

  get id() {
    return this._id
  }
  get actionId() {
    return this._actionId
  }
  get order() {
    return this._sequenceOrder
  }
  get parameters() {
    return this._parameters
  }
  get status() {
    return this._status
  }
}
