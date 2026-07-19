import { Queue, Worker } from 'bullmq'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { SweepStaleRobotRunsUseCase } from '#app/modules/robot-communication/application/use-cases/sweep-stale-robot-runs.use-case'

export const ROBOT_LIVENESS_TICK_QUEUE_NAME = 'robot-liveness-ticks'
const TICK_SCHEDULER_ID = 'robot-liveness-tick'

export async function registerRobotLivenessTick(connection: {
  host: string
  port: number
  password?: string
}): Promise<void> {
  const queue = new Queue(ROBOT_LIVENESS_TICK_QUEUE_NAME, { connection })
  await queue.upsertJobScheduler(TICK_SCHEDULER_ID, { pattern: '* * * * *' }, { name: 'tick' })
}

export function startRobotLivenessTickWorker(connection: {
  host: string
  port: number
  password?: string
}): Worker {
  const worker = new Worker(
    ROBOT_LIVENESS_TICK_QUEUE_NAME,
    async () => {
      const useCase = await app.container.make(SweepStaleRobotRunsUseCase)
      await useCase.execute(new Date())
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'RobotLivenessTickWorker: tick échoué')
  })

  return worker
}
