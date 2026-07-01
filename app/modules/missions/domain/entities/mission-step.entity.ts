import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { InvalidMissionStepOrderError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-order.error'

export default class MissionStep {
  constructor(
    private readonly _id: MissionStepId,
    private _actionId: string,
    private _sequenceOrder: number,
    private _parameters: string
  ) {}

  static create(action: string, sequenceOrder: number, parameters: string) {
    if (sequenceOrder <= 0) {
      throw new InvalidMissionStepOrderError(sequenceOrder)
    }

    return new MissionStep(MissionStepId.generate(), action, sequenceOrder, parameters)
  }

  static rehydrate(id: string, action: string, sequenceOrder: number, parameters: string) {
    return new MissionStep(MissionStepId.fromString(id), action, sequenceOrder, parameters)
  }

  public changeOrder(newOrder: number) {
    this._sequenceOrder = newOrder
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
}
