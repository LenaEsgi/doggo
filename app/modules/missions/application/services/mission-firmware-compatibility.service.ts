import { inject } from '@adonisjs/core'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { compareSemver } from '#app/modules/share/utils/semver'

export interface IncompatibleAction {
  code: string
  name: string
  minFirmwareVersion: string
}

@inject()
export class MissionFirmwareCompatibilityService {
  constructor(private actionRepository: ActionRepository) {}

  async findIncompatibleActions(
    actionIds: string[],
    robotFirmwareVersion: string
  ): Promise<IncompatibleAction[]> {
    const distinctIds = [...new Set(actionIds)]
    const actions = await Promise.all(
      distinctIds.map((id) => this.actionRepository.findById(ActionId.fromString(id)))
    )

    return actions
      .filter((action): action is NonNullable<typeof action> => action !== null)
      .filter(
        (action) =>
          action.minFirmwareVersion !== null &&
          compareSemver(robotFirmwareVersion, action.minFirmwareVersion) < 0
      )
      .map((action) => ({
        code: action.code,
        name: action.name,
        minFirmwareVersion: action.minFirmwareVersion as string,
      }))
  }
}
