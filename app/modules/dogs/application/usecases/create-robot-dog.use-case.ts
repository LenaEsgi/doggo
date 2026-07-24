import { RobotDogRepository } from '#app/modules/dogs/domain/contracts/robot-dog.repository'
import { RobotDog } from '#app/modules/dogs/domain/robot-dog.entity'
import { CreateRobotDogDto } from '#app/modules/dogs/application/DTO/create-robot-dog.dto'
import { CreateRobotDogResult } from '#app/modules/dogs/application/DTO/create-robot-dog-result.dto'
import { inject } from '@adonisjs/core'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-exists.error'
import { MqttAccountProvisioningFailedError } from '#dogs/domain/exceptions/mqtt-account-provisioning-failed.error'
import { MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'
import { MqttAccountPassword } from '#app/modules/robot-communication/domain/value-objects/mqtt-account-password'
import logger from '@adonisjs/core/services/logger'

@inject()
export class CreateRobotDogUseCase {
  constructor(
    private robotDogRepository: RobotDogRepository,
    private mqttAccountProvisioner: MqttAccountProvisioner
  ) {}

  async execute(dto: CreateRobotDogDto): Promise<CreateRobotDogResult> {
    logger.info('CreateRobotDogUseCase started', {
      serialNumber: dto.serialNumber,
      name: dto.name,
    })

    const existing = await this.robotDogRepository.findBySerialNumber(dto.serialNumber)

    if (existing) {
      logger.warn('Serial number already exists', { serialNumber: dto.serialNumber })
      throw new RobotDogSerialNumberAlreadyExistsError(dto.serialNumber)
    }

    const robotDog = RobotDog.create(dto.serialNumber, dto.name)

    // On persiste d'abord (source de vérité, réversible par un simple delete) puis on
    // provisionne le compte MQTT en dernier. Si le broker échoue/time-out, on annule la
    // création : aucun robot ne doit rester en base sans identifiants MQTT valides.
    await this.robotDogRepository.save(robotDog)

    const mqttPassword = MqttAccountPassword.generate()

    try {
      await this.mqttAccountProvisioner.provisionRobotAccount(robotDog.id.value, mqttPassword.value)
    } catch (error) {
      logger.error(
        {
          robotDogId: robotDog.id.value,
          serialNumber: dto.serialNumber,
          reason: error instanceof Error ? error.message : String(error),
        },
        'CreateRobotDogUseCase: MQTT provisioning failed, robot dog creation rolled back'
      )
      await this.robotDogRepository.delete(robotDog.id)
      throw new MqttAccountProvisioningFailedError(robotDog.id.value, error)
    }

    logger.info('Robot dog successfully created', {
      id: robotDog.id.value,
      serialNumber: robotDog.serialNumber,
    })

    return new CreateRobotDogResult(robotDog, mqttPassword.value)
  }
}
