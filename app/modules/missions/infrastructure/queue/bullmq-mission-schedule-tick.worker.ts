import { Queue, Worker } from 'bullmq'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { DispatchDueMissionSchedulesUseCase } from '#app/modules/missions/application/usecases/dispatch-due-mission-schedules.use-case'

export const MISSION_SCHEDULE_TICK_QUEUE_NAME = 'mission-schedule-ticks'
const TICK_SCHEDULER_ID = 'mission-schedule-tick'

export async function registerMissionScheduleTick(connection: {
  host: string
  port: number
  password?: string
}): Promise<void> {
  const queue = new Queue(MISSION_SCHEDULE_TICK_QUEUE_NAME, { connection })
  await queue.upsertJobScheduler(TICK_SCHEDULER_ID, { pattern: '* * * * *' }, { name: 'tick' })
}

export function startMissionScheduleTickWorker(connection: {
  host: string
  port: number
  password?: string
}): Worker {
  const worker = new Worker(
    MISSION_SCHEDULE_TICK_QUEUE_NAME,
    async () => {
      const useCase = await app.container.make(DispatchDueMissionSchedulesUseCase)
      await useCase.execute(DateTime.utc())
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'MissionScheduleTickWorker: tick échoué')
  })

  return worker
}
