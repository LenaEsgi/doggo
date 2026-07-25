import { RobotDogRepository } from '#app/modules/dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#app/modules/dogs/domain/value-objects/robot-dog-id'
import { DestroyRobotDogDto } from '#app/modules/dogs/application/DTO/destroy-robot-dog.dto'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

@inject()
export class DestroyRobotDogUseCase {
  constructor(
    private readonly robotDogRepository: RobotDogRepository,
    private readonly mqttAccountProvisioner: MqttAccountProvisioner
  ) {}

  async execute(dto: DestroyRobotDogDto): Promise<void> {
    logger.info({ robotDogId: dto.id }, 'DestroyRobotDogUseCase started')

    const id = RobotDogId.fromString(dto.id)

    const robotDog = await this.robotDogRepository.findById(id)

    if (!robotDog) {
      logger.warn({ robotDogId: dto.id }, 'RobotDog not found')
      throw new RobotDogNotFoundError(dto.id)
    }

    // Révoque le compte MQTT AVANT de supprimer la ligne DB : si la révocation échoue, on
    // n'efface pas le robot, sinon ses identifiants MQTT resteraient valides sur le broker
    // sans plus aucune trace en base pour les révoquer plus tard.
    await this.mqttAccountProvisioner.deprovisionRobotAccount(id.value)

    await this.robotDogRepository.delete(id)

    logger.info({ robotDogId: dto.id }, 'DestroyRobotDogUseCase completed successfully')
  }
}
