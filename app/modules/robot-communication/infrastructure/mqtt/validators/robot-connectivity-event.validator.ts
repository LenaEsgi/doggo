import vine from '@vinejs/vine'
import { RobotConnectivityStatus } from '#app/modules/robot-communication/domain/enums/robot-connectivity-status'
import { RobotConnectivityReason } from '#app/modules/robot-communication/domain/enums/robot-connectivity-reason'

export const robotConnectivityEventValidator = vine.compile(
  vine.object({
    status: vine.enum(Object.values(RobotConnectivityStatus)),
    reason: vine.enum(Object.values(RobotConnectivityReason)).optional(),
    rssi: vine.number().optional(),
  })
)
