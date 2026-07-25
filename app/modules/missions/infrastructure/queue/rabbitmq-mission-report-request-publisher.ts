import type { Channel } from 'amqplib'
import {
  MissionReportRequestPublisher,
  type MissionReportRequestPayload,
} from '#app/modules/missions/domain/contracts/mission-report-request-publisher'
import {
  buildRabbitMqConfigFromEnv,
  RabbitMqConnection,
} from '#app/modules/share/infrastructure/queue/rabbitmq-connection'

export const MISSION_REPORT_REQUESTS_QUEUE = 'mission-report.requests'

type ChannelFactory = () => Promise<Channel>

const defaultChannelFactory: ChannelFactory = () =>
  RabbitMqConnection.getChannel(buildRabbitMqConfigFromEnv())

export class RabbitMqMissionReportRequestPublisher implements MissionReportRequestPublisher {
  constructor(private readonly getChannel: ChannelFactory = defaultChannelFactory) {}

  async publish(payload: MissionReportRequestPayload): Promise<void> {
    const channel = await this.getChannel()
    await channel.assertQueue(MISSION_REPORT_REQUESTS_QUEUE, { durable: true })
    channel.sendToQueue(MISSION_REPORT_REQUESTS_QUEUE, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    })
  }
}
