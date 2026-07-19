import type { ApplicationService } from '@adonisjs/core/types'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import { BullMqMissionTimeoutQueue } from '#app/modules/missions/infrastructure/queue/bullmq-mission-timeout-queue'
import { MissionScheduleDispatchQueue } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'
import { BullMqMissionScheduleDispatchQueue } from '#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch-queue'
import env from '#start/env'

export default class QueueProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    const connection = {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD'),
    }

    this.app.container.singleton(MissionTimeoutQueue, () => {
      return new BullMqMissionTimeoutQueue(connection)
    })

    this.app.container.singleton(MissionScheduleDispatchQueue, () => {
      return new BullMqMissionScheduleDispatchQueue(connection)
    })
  }

  async ready() {
    if (this.app.getEnvironment() === 'web') {
      const connection = {
        host: env.get('REDIS_HOST'),
        port: env.get('REDIS_PORT'),
        password: env.get('REDIS_PASSWORD'),
      }

      const { startMissionTimeoutWorker } =
        await import('#app/modules/missions/infrastructure/queue/bullmq-mission-timeout.worker')
      startMissionTimeoutWorker(connection)

      const { registerMissionScheduleTick, startMissionScheduleTickWorker } =
        await import('#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-tick.worker')
      await registerMissionScheduleTick(connection)
      startMissionScheduleTickWorker(connection)

      const { startMissionScheduleDispatchWorker } =
        await import('#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch.worker')
      startMissionScheduleDispatchWorker(connection)

      const { registerRobotLivenessTick, startRobotLivenessTickWorker } =
        await import('#app/modules/missions/infrastructure/queue/bullmq-robot-liveness-tick.worker')
      await registerRobotLivenessTick(connection)
      startRobotLivenessTickWorker(connection)
    }
  }
}
