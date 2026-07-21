import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { InvalidMissionStepOrderError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-order.error'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'
import { type RobotDogId } from '#app/modules/dogs/domain/value-objects/robot-dog-id'
import { MissionNameCannotBeEmptyError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-cannot-be-empty.error'
import { MissionNameTooLongError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-too-long.error'
import { RobotAlreadyAssignedError } from '#app/modules/missions/domain/exceptions/robot-already-assigned.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'

export default class Mission {
  private static MAX_NAME_LENGTH = 100

  private constructor(
    private _id: MissionId,
    private _name: string,
    private _robotDogIds: RobotDogId[],
    private _userId: string,
    private _missionSteps: MissionStep[],
    private _stepsCount?: number
  ) {}

  public static create(name: string, userId: string) {
    return new Mission(MissionId.generate(), name, [], userId, [])
  }

  public static rehydrate(
    id: string,
    name: string,
    userId: string,
    missionSteps: MissionStep[] = [],
    robotDogIds?: RobotDogId[],
    stepsCount?: number
  ) {
    return new Mission(
      MissionId.fromString(id),
      name,
      robotDogIds ?? [],
      userId,
      missionSteps,
      stepsCount
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

  public addStep(actionId: string, parameters: string, hasActiveRun: boolean = false): void {
    this.ensureEditable(hasActiveRun)

    const nextOrder = this._missionSteps.length + 1
    const step = MissionStep.create(actionId, nextOrder, parameters)

    this._missionSteps.push(step)
  }

  public removeStep(id: MissionStepId, hasActiveRun: boolean = false): void {
    this.ensureEditable(hasActiveRun)

    const index = this._missionSteps.findIndex((s) => s.id.equals(id))

    if (index === -1) {
      throw new InvalidMissionStepNotFoundError(id)
    }

    this._missionSteps.splice(index, 1)
    this.reorderSteps()
  }

  public moveStep(stepId: MissionStepId, newOrder: number, hasActiveRun: boolean = false): void {
    this.ensureEditable(hasActiveRun)

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
    desired: Array<{ id?: string; actionId: string; parameters: string }>,
    hasActiveRun: boolean = false
  ): void {
    this.ensureEditable(hasActiveRun)

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

  public assignRobot(robotDogId: RobotDogId): void {
    if (this._robotDogIds.some((id) => id.equals(robotDogId))) {
      throw new RobotAlreadyAssignedError(this._id.value, robotDogId.value)
    }
    this._robotDogIds.push(robotDogId)
  }

  public unassignRobot(robotDogId: RobotDogId): void {
    const index = this._robotDogIds.findIndex((id) => id.equals(robotDogId))
    if (index === -1) {
      throw new MissionNotAssignedToRobotError(this._id.value, robotDogId.value)
    }
    this._robotDogIds.splice(index, 1)
  }

  private ensureEditable(hasActiveRun: boolean): void {
    if (hasActiveRun) {
      throw new InvalidMissionNotEditableError()
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

  get missionSteps(): MissionStep[] {
    return this._missionSteps
  }

  get stepsCount(): number {
    return this._stepsCount ?? this._missionSteps.length
  }
}
