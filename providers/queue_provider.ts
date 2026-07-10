import type { ApplicationService } from '@adonisjs/core/types'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import { BullMqMissionTimeoutQueue } from '#app/modules/missions/infrastructure/queue/bullmq-mission-timeout-queue'
import env from '#start/env'

export default class QueueProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(MissionTimeoutQueue, () => {
      return new BullMqMissionTimeoutQueue({
        host: env.get('REDIS_HOST'),
        port: env.get('REDIS_PORT'),
      })
    })
  }

  async ready() {
    if (this.app.getEnvironment() === 'web') {
      const { startMissionTimeoutWorker } = await import(
        '#app/modules/missions/infrastructure/queue/bullmq-mission-timeout.worker'
      )
      startMissionTimeoutWorker({
        host: env.get('REDIS_HOST'),
        port: env.get('REDIS_PORT'),
      })
    }
  }
}
