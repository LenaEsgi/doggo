import { RobotDogState } from './enums/robot-dog.state.js'
import { InvalidDogStateError } from './exceptions/invalid-dog-state-error.js'
import { BatteryTooLowError } from './exceptions/battery-too-low-error.js'
import { InvalidBatteryLevelError } from './exceptions/invalid-battery-level-error.js'
import { RobotDogId } from './value-objects/robot-dog-id.js'
import { InvalidRobotDogNameError } from './exceptions/invalid-robot-dog-name.error.js'
import { InvalidRobotDogSerialNumberError } from './exceptions/invalid-robot-dog-serial-number.error.js'
import { RobotDogKey } from './value-objects/robot-dog-key.js'

export class RobotDog {
  private static readonly MIN_BATTERY_FOR_ACTIVITY = 10
  private static readonly HEARTBEAT_TIMEOUT_MS = 30_000

  private constructor(
    public readonly id: RobotDogId,
    public readonly serialNumber: string,
    public readonly  key: RobotDogKey,
    public name: string,
    private _state: RobotDogState,
    private _batteryLevel: number,
    private _lastHeartbeat: Date
  ) {}

  public static create(serialNumber: string, name: string, batteryLevel: number): RobotDog {
    if (!serialNumber) {
      throw new InvalidRobotDogSerialNumberError()
    }

    if (!name) {
      throw new InvalidRobotDogNameError(name)
    }

    if (batteryLevel === undefined || batteryLevel < 0 || batteryLevel > 100) {
      throw new InvalidBatteryLevelError(batteryLevel)
    }

    return new RobotDog(RobotDogId.generate(), serialNumber, RobotDogKey.generate(), name,  RobotDogState.IDLE, batteryLevel, new Date())
  }

  public static rehydrate(
    id: string,
    serialNumber: string,
    key: string,
    name: string,
    state: RobotDogState,
    batteryLevel: number,
    lastHeartbeat: Date
  ): RobotDog {
    return new RobotDog(RobotDogId.fromString(id), serialNumber, RobotDogKey.fromString(key), name, state, batteryLevel, lastHeartbeat)
  }

  // -------------------
  // Getter
  // -------------------

  public get state(): RobotDogState {
    return this._state
  }

  public get batteryLevel(): number {
    return this._batteryLevel
  }

  public get lastHeartbeat(): Date {
    return this._lastHeartbeat
  }

  // -------------------
  // Business
  // -------------------

  public startSession(): void {
    this.ensureOnline()
    this.ensureIdle()
    this.ensureBatterySufficient()

    this._state = RobotDogState.IN_SESSION
  }

  public endSession(): void {
    if (this._state !== RobotDogState.IN_SESSION) {
      throw new InvalidDogStateError(`No active session to end`)
    }

    this._state = RobotDogState.IDLE
  }

  public startMission(): void {
    this.ensureOnline()
    this.ensureIdle()
    this.ensureBatterySufficient()

    this._state = RobotDogState.IN_MISSION
  }

  public endMission(): void {
    if (this._state !== RobotDogState.IN_MISSION) {
      throw new InvalidDogStateError(`No active mission to end`)
    }

    this._state = RobotDogState.IDLE
  }

  public markCharging(): void {
    this.ensureIdle()

    this._state = RobotDogState.CHARGING
  }

  public stopCharging(): void {
    if (this._state !== RobotDogState.CHARGING) {
      throw new InvalidDogStateError(`Robot is not charging`)
    }

    this._state = RobotDogState.IDLE
  }

  public markError(): void {
    this._state = RobotDogState.ERROR
  }

  public markOffline(): void {
    this._state = RobotDogState.OFFLINE
  }

  public restoreOnline(): void {
    if (this._state !== RobotDogState.OFFLINE) {
      throw new InvalidDogStateError(`Robot is not offline`)
    }

    this._state = RobotDogState.IDLE
  }

  public updateBatteryLevel(batteryLevel: number): void {
    this.ensureBatteryIsValid(batteryLevel)

    this._batteryLevel = batteryLevel
  }

  public updateHeartbeat(date: Date): void {
    this._lastHeartbeat = date
  }

  public checkHeartbeatTimeout(now: Date): void {
    const diff = now.getTime() - this._lastHeartbeat.getTime()

    if (diff > RobotDog.HEARTBEAT_TIMEOUT_MS) {
      this._state = RobotDogState.OFFLINE
    }
  }

  public updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new InvalidRobotDogNameError(name)
    }

    this.name = name
  }

  // -------------------
  // Private Guards
  // -------------------

  private ensureIdle(): void {
    if (this._state !== RobotDogState.IDLE) {
      throw new InvalidDogStateError(`Robot must be IDLE. Current state: ${this._state}`)
    }
  }

  private ensureOnline(): void {
    if (this._state === RobotDogState.OFFLINE || this._state === RobotDogState.ERROR) {
      throw new InvalidDogStateError(`Robot is not available. Current state: ${this._state}`)
    }
  }

  private ensureBatterySufficient(): void {
    if (this._batteryLevel < RobotDog.MIN_BATTERY_FOR_ACTIVITY) {
      throw new BatteryTooLowError('Battery level too low')
    }
  }

  private ensureBatteryIsValid(batteryLevel: number): void {
    if (batteryLevel < 0 || batteryLevel > 100) {
      throw new InvalidBatteryLevelError(batteryLevel)
    }
  }
}
