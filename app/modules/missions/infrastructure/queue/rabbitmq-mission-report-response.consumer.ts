import type { Channel, ConsumeMessage } from 'amqplib'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { RabbitMqConnection } from '#app/modules/share/infrastructure/queue/rabbitmq-connection'
import {
  HandleMissionReportResponseUseCase,
  type MissionReportResponsePayload,
} from '#app/modules/missions/application/use-cases/handle-mission-report-response.use-case'

export const MISSION_REPORT_RESPONSES_QUEUE = 'mission-report.responses'

export async function startMissionReportResponseConsumer(): Promise<void> {
  const channel: Channel = await RabbitMqConnection.getChannel({
    hostname: env.get('RABBITMQ_HOST'),
    port: env.get('RABBITMQ_PORT'),
    username: env.get('RABBITMQ_USERNAME'),
    password: env.get('RABBITMQ_PASSWORD'),
    vhost: env.get('RABBITMQ_VHOST'),
  })

  await channel.assertQueue(MISSION_REPORT_RESPONSES_QUEUE, { durable: true })

  await channel.consume(MISSION_REPORT_RESPONSES_QUEUE, (message: ConsumeMessage | null) => {
    if (!message) return
    void handleMessage(channel, message)
  })
}

async function handleMessage(channel: Channel, message: ConsumeMessage): Promise<void> {
  try {
    const payload = JSON.parse(message.content.toString('utf8')) as MissionReportResponsePayload
    const useCase = await app.container.make(HandleMissionReportResponseUseCase)
    await useCase.execute(payload)
    channel.ack(message)
  } catch (error) {
    logger.error({ err: error }, 'MissionReportResponseConsumer: échec de traitement, message rejeté')
    try {
      channel.nack(message, false, false)
    } catch (nackError) {
      logger.error(
        { err: nackError },
        'MissionReportResponseConsumer: échec du nack (canal/connexion probablement fermé)'
      )
    }
  }
}
