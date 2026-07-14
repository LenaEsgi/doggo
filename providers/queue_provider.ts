import type { ApplicationService } from '@adonisjs/core/types'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import { BullMqMissionTimeoutQueue } from '#app/modules/missions/infrastructure/queue/bullmq-mission-timeout-queue'
import { MissionScheduleDispatchQueue } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'
import { BullMqMissionScheduleDispatchQueue } from '#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch-queue'
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

    this.app.container.singleton(MissionScheduleDispatchQueue, () => {
      return new BullMqMissionScheduleDispatchQueue({
        host: env.get('REDIS_HOST'),
        port: env.get('REDIS_PORT'),
      })
    })
  }

  async ready() {
    if (this.app.getEnvironment() === 'web') {
      const connection = { host: env.get('REDIS_HOST'), port: env.get('REDIS_PORT') }

      const { startMissionTimeoutWorker } = await import(
        '#app/modules/missions/infrastructure/queue/bullmq-mission-timeout.worker'
      )
      startMissionTimeoutWorker(connection)

      const { registerMissionScheduleTick, startMissionScheduleTickWorker } = await import(
        '#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-tick.worker'
      )
      await registerMissionScheduleTick(connection)
      startMissionScheduleTickWorker(connection)

      const { startMissionScheduleDispatchWorker } = await import(
        '#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch.worker'
      )
      startMissionScheduleDispatchWorker(connection)
    }
  }
}
