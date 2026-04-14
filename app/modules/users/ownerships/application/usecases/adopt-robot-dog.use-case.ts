import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class AdoptRobotDogUseCase {
  constructor(
    private readonly userGateway: UserOwnershipGateway,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly ownershipWriteRepository: OwnershipWriteRepository
  ) {}

  async execute(userId: string, serialNumber: string): Promise<void> {
    logger.info({ userId, serialNumber }, 'AdoptRobotDogUseCase started')

    const userExists = await this.userGateway.existsById(userId)
    if (!userExists) {
      logger.warn({ userId, serialNumber }, 'User not found in AdoptRobotDogUseCase')
      throw new InvalidUserNotFoundError(userId)
    }

    const robotDog = await this.robotDogGateway.findBySerialNumber(serialNumber)
    if (!robotDog) {
      logger.warn({ userId, serialNumber }, 'RobotDog not found in AdoptRobotDogUseCase')
      throw new RobotDogNotFoundError(serialNumber)
    }

    await this.ownershipWriteRepository.adopt(userId, robotDog.id.value, new Date())

    try {
      const cloudFunctionUrl = 'https://email-doggo-711913037876.europe-west1.run.app/sendEmail'

      const tokenResponse = await fetch(
        `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${cloudFunctionUrl}`,
        { headers: { 'Metadata-Flavor': 'Google' } }
      )
      const token = await tokenResponse.text()

      await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: 'arthur.morelon@gmail.com',
          subject: 'Félicitations pour votre adoption !',
          html: `<h1>Bienvenue !</h1><p>Vous avez bien adopté votre robot dog. Profitez-en bien !</p>`,
        }),
      })

      logger.info({ userId }, 'Email envoyé avec succès')
    } catch (error) {
      logger.warn({ userId, error }, 'Échec envoi email, adoption toujours valide')
    }

    logger.info({ userId, serialNumber }, 'AdoptRobotDogUseCase completed successfully')
  }
}
