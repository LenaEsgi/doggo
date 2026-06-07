import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStatus } from '#app/modules/missions/domain/enums/mission-status'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { InvalidMissionNotRunningError } from '../exceptions/invalid-mission-not-running.error.ts'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { InvalidMissionStepOrderError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-order.error'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'
import { type RobotDogId } from '#app/modules/dogs/domain/value-objects/robot-dog-id'
import { MissionNameCannotBeEmptyError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-cannot-be-empty.error'
import { MissionNameTooLongError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-too-long.error'

export default class Mission {
  private static MAX_NAME_LENGTH = 100

  private constructor(
    private _id: MissionId,
    private _name: string,
    private _robotDogIds: RobotDogId[],
    private _userId: string,
    private _status: MissionStatus,
    private _missionSteps: MissionStep[]
  ) {}

  public static create(name: string, userId: string) {
    return new Mission(MissionId.generate(), name, [], userId, MissionStatus.STAND_BY, [])
  }

  public static rehydrate(
    id: string,
    name: string,
    userId: string,
    status: MissionStatus,
    missionSteps: MissionStep[] = [],
    robotDogIds?: RobotDogId[]
  ) {
    return new Mission(
      MissionId.fromString(id),
      name,
      robotDogIds ?? [],
      userId,
      status,
      missionSteps
    )
  }

  // -------------------
  // Business
  // -------------------

  rename(newName: string) {
    if (!newName || !newName.trim()) {
      throw new MissionNameCannotBeEmptyError()
    }

    if (newName.length > Mission.MAX_NAME_LENGTH) {
      throw new MissionNameTooLongError(Mission.MAX_NAME_LENGTH)
    }

    this._name = newName.trim()
  }

  public startMission() {
    if (this._status === MissionStatus.RUNNING) {
      throw new InvalidMissionAlreadyRunningError()
    }

    this._status = MissionStatus.RUNNING
  }

  public endMission() {
    if (this._status !== MissionStatus.RUNNING) {
      throw new InvalidMissionNotRunningError()
    }

    this._status = MissionStatus.STAND_BY
  }

  public interruptMission() {
    if (this._status !== MissionStatus.RUNNING) {
      throw new InvalidMissionNotRunningError()
    }

    this._status = MissionStatus.INTERRUPTED
  }

  public addStep(actionId: string, parameters: string): void {
    this.ensureEditable()

    const nextOrder = this._missionSteps.length + 1

    const step = MissionStep.create(actionId, nextOrder, parameters)

    this._missionSteps.push(step)
  }

  public removeStep(id: MissionStepId): void {
    this.ensureEditable()

    const index = this._missionSteps.findIndex((s) => s.id.equals(id))

    if (index === -1) {
      throw new InvalidMissionStepNotFoundError(id)
    }

    this._missionSteps.splice(index, 1)
    this.reorderSteps()
  }

  public moveStep(stepId: MissionStepId, newOrder: number): void {
    this.ensureEditable()

    const stepToMove = this._missionSteps.find((s) => s.id.equals(stepId))
    if (!stepToMove) {
      throw new InvalidMissionStepNotFoundError(stepId)
    }

    const maxOrder = this._missionSteps.length
    if (newOrder <= 0 || newOrder > maxOrder) {
      throw new InvalidMissionStepOrderError(newOrder)
    }

    const oldOrder = stepToMove.order

    if (newOrder === oldOrder) return

    if (newOrder < oldOrder) {
      this._missionSteps.forEach((s) => {
        if (s.order >= newOrder && s.order < oldOrder) {
          s.changeOrder(s.order + 1)
        }
      })
    }

    if (newOrder > oldOrder) {
      this._missionSteps.forEach((s) => {
        if (s.order <= newOrder && s.order > oldOrder) {
          s.changeOrder(s.order - 1)
        }
      })
    }
    stepToMove.changeOrder(newOrder)
  }

  public syncSteps(
    desired: Array<{ id?: string; actionId: string; parameters: string }>
  ): void {
    this.ensureEditable()

    const newSteps: MissionStep[] = desired.map((item, index) => {
      const order = index + 1

      if (item.id) {
        const existing = this._missionSteps.find((s) => s.id.value === item.id)
        if (!existing) {
          throw new InvalidMissionStepNotFoundError(MissionStepId.fromString(item.id))
        }
        existing.changeOrder(order)
        return existing
      }

      return MissionStep.create(item.actionId, order, item.parameters)
    })

    this._missionSteps = newSteps
  }

  public getStepsInOrder(): MissionStep[] {
    return [...this._missionSteps].sort((a, b) => a.order - b.order)
  }

  private ensureEditable(): void {
    if (this._status !== MissionStatus.STAND_BY) {
      throw new InvalidMissionNotEditableError(this._status)
    }
  }

  private reorderSteps(): void {
    this._missionSteps
      .sort((a, b) => a.order - b.order)
      .forEach((step, index) => {
        step.changeOrder(index + 1)
      })
  }

  get id(): MissionId {
    return this._id
  }

  get name(): string {
    return this._name
  }

  get robotDogIds(): RobotDogId[] {
    return this._robotDogIds
  }

  get userId(): string {
    return this._userId
  }

  get status(): MissionStatus {
    return this._status
  }

  get missionSteps(): MissionStep[] {
    return this._missionSteps
  }
}
