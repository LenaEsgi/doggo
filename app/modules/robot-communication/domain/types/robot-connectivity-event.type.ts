import { type RobotConnectivityStatus } from '#app/modules/robot-communication/domain/enums/robot-connectivity-status'
import { type RobotConnectivityReason } from '#app/modules/robot-communication/domain/enums/robot-connectivity-reason'

export interface RobotConnectivityEvent {
  status: RobotConnectivityStatus
  reason?: RobotConnectivityReason
  rssi?: number
}
