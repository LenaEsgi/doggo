import { Worker } from 'bullmq'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { MISSION_TIMEOUT_QUEUE_NAME } from '#app/modules/missions/infrastructure/queue/bullmq-mission-timeout-queue'
import { HandlePendingRunTimeoutUseCase } from '#app/modules/robot-communication/application/use-cases/handle-pending-run-timeout.use-case'

export function startMissionTimeoutWorker(connection: { host: string; port: number }): Worker {
  const worker = new Worker(
    MISSION_TIMEOUT_QUEUE_NAME,
    async (job) => {
      const { runId, dogId } = job.data as { runId: string; dogId: string }
      const useCase = await app.container.make(HandlePendingRunTimeoutUseCase)
      await useCase.execute(runId, dogId)
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'MissionTimeoutWorker: job échoué')
  })

  return worker
}
