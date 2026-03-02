import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'
import { MissionStatus } from '#app/modules/missions/domain/enums/mission-status'
import {
  InvalidMissionAlreadyRunningError
} from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { InvalidMissionNotRunningError } from '../exceptions/Invalid-mission-not-running.error.ts'

export default class Mission {
  private constructor(
    private _id: MissionId,
    private _name: string,
    private _status: MissionStatus,
    private _missionSteps: MissionStep[]
  ) {}

  public static create(name: string) {
    return new Mission(MissionId.generate(), name, MissionStatus.STAND_BY, new Array<MissionStep>())
  }

  public static rehydrate(id: string, name: string, status: MissionStatus) {
    return new Mission(MissionId.fromString(id), name, status, new Array<MissionStep>())
  }

  // -------------------
  // Business
  // -------------------

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


}
