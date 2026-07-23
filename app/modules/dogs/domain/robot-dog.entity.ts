import { RobotDogState } from './enums/robot-dog.state.js'
import { InvalidDogStateError } from './exceptions/invalid-dog-state-error.js'
import { BatteryTooLowError } from './exceptions/battery-too-low-error.js'
import { InvalidBatteryLevelError } from './exceptions/invalid-battery-level-error.js'
import { RobotDogId } from './value-objects/robot-dog-id.js'
import { InvalidRobotDogNameError } from './exceptions/invalid-robot-dog-name.error.js'
import { InvalidRobotDogSerialNumberError } from './exceptions/invalid-robot-dog-serial-number.error.js'
import { RobotDogKey } from './value-objects/robot-dog-key.js'
import { InvalidFirmwareVersionError } from './exceptions/invalid-firmware-version.error.js'
import { isValidSemver } from '#app/modules/share/utils/semver'

export class RobotDog {
  private static readonly MIN_BATTERY_FOR_ACTIVITY = 10
  private static readonly LOW_BATTERY_WARNING_THRESHOLD = 20
  private static readonly HEARTBEAT_TIMEOUT_MS = 30_000
  private static readonly DEFAULT_BATTERY_LEVEL = 100
  private static readonly DEFAULT_FIRMWARE_VERSION = '1.0.0'

  private constructor(
    public readonly id: RobotDogId,
    public readonly serialNumber: string,
    public readonly key: RobotDogKey,
    public name: string,
    private _state: RobotDogState,
    private _batteryLevel: number,
    private _lastHeartbeat: Date,
    private _firmwareVersion: string = RobotDog.DEFAULT_FIRMWARE_VERSION
  ) {}

  public static create(
    serialNumber: string,
    name: string,
    batteryLevel: number = RobotDog.DEFAULT_BATTERY_LEVEL
  ): RobotDog {
    if (!serialNumber) {
      throw new InvalidRobotDogSerialNumberError()
    }

    if (!name) {
      throw new InvalidRobotDogNameError(name)
    }

    if (batteryLevel < 0 || batteryLevel > 100) {
      throw new InvalidBatteryLevelError(batteryLevel)
    }

    return new RobotDog(
      RobotDogId.generate(),
      serialNumber,
      RobotDogKey.generate(),
      name,
      RobotDogState.IDLE,
      batteryLevel,
      new Date()
    )
  }

  public static rehydrate(
    id: string,
    serialNumber: string,
    key: string,
    name: string,
    state: RobotDogState,
    batteryLevel: number,
    lastHeartbeat: Date,
    firmwareVersion: string = RobotDog.DEFAULT_FIRMWARE_VERSION
  ): RobotDog {
    return new RobotDog(
      RobotDogId.fromString(id),
      serialNumber,
      RobotDogKey.fromString(key),
      name,
      state,
      batteryLevel,
      lastHeartbeat,
      firmwareVersion
    )
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

  public get firmwareVersion(): string {
    return this._firmwareVersion
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
      throw new InvalidDogStateError('NO_ACTIVE_SESSION', this._state)
    }

    this._state = RobotDogState.IDLE
  }

  public endMission(): void {
    if (this._state !== RobotDogState.IN_MISSION) {
      throw new InvalidDogStateError('NO_ACTIVE_MISSION', this._state)
    }

    this._state = RobotDogState.IDLE
  }

  public validateForMission(): void {
    this.ensureOnline()
    this.ensureIdle()
    this.ensureBatterySufficient()
  }

  public ensureLiveControlAllowed(): void {
    if (this._state !== RobotDogState.IN_SESSION) {
      throw new InvalidDogStateError('NO_ACTIVE_SESSION', this._state)
    }
  }

  public applyStateFromRobot(state: RobotDogState): void {
    this._state = state
  }

  public markCharging(): void {
    this.ensureIdle()

    this._state = RobotDogState.CHARGING
  }

  public stopCharging(): void {
    if (this._state !== RobotDogState.CHARGING) {
      throw new InvalidDogStateError('NOT_CHARGING', this._state)
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
      throw new InvalidDogStateError('NOT_OFFLINE', this._state)
    }

    this._state = RobotDogState.IDLE
  }

  public updateBatteryLevel(batteryLevel: number): void {
    this.ensureBatteryIsValid(batteryLevel)

    this._batteryLevel = batteryLevel
  }

  // Vrai uniquement au moment où la batterie franchit le seuil d'alerte vers le bas
  // (pas à chaque télémétrie tant qu'elle reste sous le seuil), et seulement si elle
  // n'est pas déjà dans la zone critique qui bloque le démarrage d'une mission.
  public hasEnteredLowBatteryZone(previousLevel: number): boolean {
    return (
      previousLevel > RobotDog.LOW_BATTERY_WARNING_THRESHOLD &&
      this._batteryLevel <= RobotDog.LOW_BATTERY_WARNING_THRESHOLD &&
      this._batteryLevel > RobotDog.MIN_BATTERY_FOR_ACTIVITY
    )
  }

  public updateHeartbeat(date: Date): void {
    this._lastHeartbeat = date
  }

  public updateFirmwareVersion(version: string): void {
    if (!isValidSemver(version)) {
      throw new InvalidFirmwareVersionError(version)
    }
    this._firmwareVersion = version
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
      throw new InvalidDogStateError('NOT_IDLE', this._state)
    }
  }

  private ensureOnline(): void {
    if (this._state === RobotDogState.OFFLINE || this._state === RobotDogState.ERROR) {
      throw new InvalidDogStateError(
        this._state === RobotDogState.OFFLINE ? 'OFFLINE' : 'ERROR',
        this._state
      )
    }
  }

  private ensureBatterySufficient(): void {
    if (this._batteryLevel < RobotDog.MIN_BATTERY_FOR_ACTIVITY) {
      throw new BatteryTooLowError(this._batteryLevel)
    }
  }

  private ensureBatteryIsValid(batteryLevel: number): void {
    if (batteryLevel < 0 || batteryLevel > 100) {
      throw new InvalidBatteryLevelError(batteryLevel)
    }
  }
}
