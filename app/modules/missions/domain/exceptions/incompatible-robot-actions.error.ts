import { DomainError } from '#app/modules/share/exceptions/domain-error'

interface IncompatibleAction {
  code: string
  name: string
  minFirmwareVersion: string
}

export class IncompatibleRobotActionsError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'INCOMPATIBLE_ROBOT_ACTIONS'

  constructor(robotFirmwareVersion: string, actions: IncompatibleAction[]) {
    super(
      `Robot firmware ${robotFirmwareVersion} does not support: ${actions.map((a) => a.name).join(', ')}`,
      { robotFirmwareVersion, actions }
    )
  }
}
