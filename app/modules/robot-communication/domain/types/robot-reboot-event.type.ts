import { type RobotBootReason } from '#app/modules/robot-communication/domain/enums/robot-boot-reason'

export interface RobotRebootEvent {
  firmwareVersion: string
  bootReason: RobotBootReason
  uptimeBeforeRebootSec?: number
}
