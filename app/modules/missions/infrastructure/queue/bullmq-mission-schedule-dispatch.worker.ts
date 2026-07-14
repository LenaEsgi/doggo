import { Worker } from 'bullmq'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { MISSION_SCHEDULE_DISPATCH_QUEUE_NAME } from '#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch-queue'
import { HandleMissionScheduleDispatchUseCase } from '#app/modules/missions/application/usecases/handle-mission-schedule-dispatch.use-case'
import { type MissionScheduleDispatchPayload } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'

export function startMissionScheduleDispatchWorker(connection: {
  host: string
  port: number
}): Worker {
  const worker = new Worker(
    MISSION_SCHEDULE_DISPATCH_QUEUE_NAME,
    async (job) => {
      const payload = job.data as MissionScheduleDispatchPayload
      const useCase = await app.container.make(HandleMissionScheduleDispatchUseCase)
      await useCase.execute(payload)
    },
    { connection, concurrency: 5 }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'MissionScheduleDispatchWorker: dispatch échoué')
  })

  return worker
}
