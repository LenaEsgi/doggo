import mqtt, { type MqttClient } from 'mqtt'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import {
  RobotCommand,
  type RobotCommandPayload,
} from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotTelemetry } from '#app/modules/robot-communication/domain/types/robot-telemetry.type'
import { type RobotMissionUpdate } from '#app/modules/robot-communication/domain/types/robot-mission-update.type'
import { HandleRobotTelemetryUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-telemetry.use-case'
import { HandleRobotMissionUpdateUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case'

export class MqttServiceImplementation implements RobotCommunicationService {
  private client!: MqttClient

  async connect(): Promise<void> {
    const host = env.get('MQTT_HOST')
    const port = env.get('MQTT_PORT')

    this.client = await mqtt.connectAsync(`mqtt://${host}:${port}`, {
      clientId: `doggo-backend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
    })

    logger.info({ host, port }, 'MqttService: connected to broker')

    await this.client.subscribeAsync('robot/+/telemetry')
    await this.client.subscribeAsync('robot/+/mission/step')
    await this.client.subscribeAsync('robot/+/connected')

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload).catch((err) => {
        logger.error({ err, topic }, 'MqttService: unhandled error in message handler')
      })
    })

    this.client.on('error', (err) => {
      logger.error({ err }, 'MqttService: connection error')
    })

    this.client.on('reconnect', () => {
      logger.warn('MqttService: reconnecting...')
    })
  }

  async disconnect(): Promise<void> {
    if (this.client?.connected) {
      await this.client.endAsync()
      logger.info('MqttService: disconnected from broker')
    }
  }

  async sendCommand(dogId: string, command: RobotCommand, missionId?: string): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client is not connected')
    }

    const topic = `robot/${dogId}/command`
    const payload: RobotCommandPayload = { type: command, missionId }

    await this.client.publishAsync(topic, JSON.stringify(payload), { qos: 1 })

    logger.info({ dogId, command }, 'MqttService: command sent')
  }

  private async handleMessage(topic: string, rawPayload: Buffer): Promise<void> {
    const segments = topic.split('/')
    const dogId = segments[1]

    if (!dogId) return

    const raw = rawPayload.toString()

    if (topic === `robot/${dogId}/telemetry`) {
      await this.handleTelemetry(dogId, raw)
    } else if (topic === `robot/${dogId}/mission/step`) {
      await this.handleMissionUpdate(dogId, raw)
    } else if (topic === `robot/${dogId}/connected`) {
      this.handleConnectionStatus(dogId, raw)
    }
  }

  private async handleTelemetry(dogId: string, raw: string): Promise<void> {
    let telemetry: RobotTelemetry

    try {
      telemetry = JSON.parse(raw) as RobotTelemetry
    } catch {
      logger.warn({ dogId, raw }, 'MqttService: invalid telemetry payload')
      return
    }

    const useCase = await app.container.make(HandleRobotTelemetryUseCase)
    await useCase.execute(dogId, telemetry)
  }

  private async handleMissionUpdate(dogId: string, raw: string): Promise<void> {
    let update: RobotMissionUpdate

    try {
      update = JSON.parse(raw) as RobotMissionUpdate
    } catch {
      logger.warn({ dogId, raw }, 'MqttService: invalid mission update payload')
      return
    }

    const useCase = await app.container.make(HandleRobotMissionUpdateUseCase)
    await useCase.execute(dogId, update)
  }

  private handleConnectionStatus(dogId: string, status: string): void {
    logger.info({ dogId, status }, 'MqttService: robot connection status changed')
  }
}
