import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import type DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

// Alerte les propriétaires quand le robot devient injoignable (heartbeat perdu) ou
// signale lui-même une erreur - états qui autrement ne se voient qu'en direct sur le
// dashboard (juste un badge SSE éphémère), sans trace dans l'historique Alertes.
@inject()
export default class RobotStateAlertSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly ownershipReadRepository: OwnershipReadRepository,
    private readonly robotDogGateway: RobotDogOwnershipGateway
  ) {}

  async handle(event: DogStateChangedEvent): Promise<void> {
    if (event.state !== RobotDogState.OFFLINE && event.state !== RobotDogState.ERROR) return

    try {
      const [ownerIds, dogs] = await Promise.all([
        this.ownershipReadRepository.findAllActiveUserIdsByRobotDogId(event.dogId),
        this.robotDogGateway.findByIds([event.dogId]),
      ])

      const robotDogName = dogs[0]?.name ?? 'Robot'
      const type = event.state === RobotDogState.OFFLINE ? 'dog.offline' : 'dog.error'
      const severity = event.state === RobotDogState.OFFLINE ? 'warning' : 'critical'

      await this.notificationService.createBulk(
        ownerIds,
        type,
        severity,
        { robotDogName },
        event.dogId
      )
      logger.info(
        { dogId: event.dogId, state: event.state, ownerCount: ownerIds.length },
        'RobotStateAlertSseListener: notifications created'
      )
    } catch (error) {
      logger.error({ err: error, dogId: event.dogId }, 'RobotStateAlertSseListener: failed')
    }
  }
}
