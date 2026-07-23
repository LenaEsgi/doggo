import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { LiveControlGateway } from '#app/modules/robot-communication/domain/contracts/live-control.gateway'
import { findLiveControlAction } from '#app/modules/robot-communication/domain/live-control-action.catalog'

@inject()
export class DispatchLiveCommandUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly liveControlGateway: LiveControlGateway
  ) {}

  async execute(
    dogId: string,
    actionCode: string,
    parameters: Record<string, unknown>
  ): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    dog.ensureLiveControlAllowed()

    // Catalogue figé en code, jamais en base : une commande live doit être
    // validée instantanément, sans dépendre de la disponibilité de la DB.
    const action = findLiveControlAction(actionCode)
    if (!action) {
      throw new ActionNotFoundError(actionCode)
    }

    action.validateParameters(JSON.stringify(parameters))

    await this.liveControlGateway.relayCommand(dogId, { actionCode, parameters })
  }
}
