import { readFileSync } from 'node:fs'
import mqtt, { type MqttClient } from 'mqtt'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { type RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import {
  type RobotCommand,
  type RobotCommandData,
  type RobotCommandPayload,
} from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotTelemetry } from '#app/modules/robot-communication/domain/types/robot-telemetry.type'
import { type RobotMissionUpdate } from '#app/modules/robot-communication/domain/types/robot-mission-update.type'
import { type RobotRebootEvent } from '#app/modules/robot-communication/domain/types/robot-reboot-event.type'
import { type RobotErrorEvent } from '#app/modules/robot-communication/domain/types/robot-error-event.type'
import { type RobotConnectivityEvent } from '#app/modules/robot-communication/domain/types/robot-connectivity-event.type'
import { type RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { HandleRobotTelemetryUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-telemetry.use-case'
import { HandleRobotMissionUpdateUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case'
import { HandleRobotStateChangedUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-state-changed.use-case'
import { HandleRobotRebootUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-reboot.use-case'
import { HandleRobotErrorUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-error.use-case'
import { HandleRobotConnectivityUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-connectivity.use-case'
import { robotTelemetryValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-telemetry.validator'
import { robotMissionUpdateValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-mission-update.validator'
import { robotStateValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-state.validator'
import { robotRebootEventValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-reboot-event.validator'
import { robotErrorEventValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-error-event.validator'
import { robotConnectivityEventValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-connectivity-event.validator'

export class MqttServiceImplementation implements RobotCommunicationService {
  private client!: MqttClient

  async connect(): Promise<void> {
    const host = env.get('MQTT_HOST')
    const port = env.get('MQTT_PORT')
    const useTls = env.get('MQTT_USE_TLS', false)
    const protocol = useTls ? 'mqtts' : 'mqtt'
    const caPath = env.get('MQTT_CA_PATH')

    this.client = await mqtt.connectAsync(`${protocol}://${host}:${port}`, {
      clientId: `doggo-backend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      username: env.get('MQTT_USERNAME'),
      password: env.get('MQTT_PASSWORD'),
      ...(useTls && caPath ? { ca: readFileSync(caPath) } : {}),
    })

    logger.info({ host, port, tls: useTls }, 'MqttService: connected to broker')

    await this.client.subscribeAsync('robot/+/telemetry')
    await this.client.subscribeAsync('robot/+/mission/step')
    await this.client.subscribeAsync('robot/+/connected')
    await this.client.subscribeAsync('robot/+/state')
    await this.client.subscribeAsync('robot/+/system')
    await this.client.subscribeAsync('robot/+/error')

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

  async sendCommand(dogId: string, command: RobotCommand, data?: RobotCommandData): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client is not connected')
    }

    const topic = `robot/${dogId}/command`
    const payload: RobotCommandPayload = { type: command, ...data }

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
      await this.handleConnectionStatus(dogId, raw)
    } else if (topic === `robot/${dogId}/state`) {
      await this.handleStateChanged(dogId, raw)
    } else if (topic === `robot/${dogId}/system`) {
      await this.handleReboot(dogId, raw)
    } else if (topic === `robot/${dogId}/error`) {
      await this.handleError(dogId, raw)
    }
  }

  private async handleTelemetry(dogId: string, raw: string): Promise<void> {
    let telemetry: RobotTelemetry

    try {
      telemetry = await robotTelemetryValidator.validate(JSON.parse(raw))
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
      update = await robotMissionUpdateValidator.validate(JSON.parse(raw))
    } catch {
      logger.warn({ dogId, raw }, 'MqttService: invalid mission update payload')
      return
    }

    const useCase = await app.container.make(HandleRobotMissionUpdateUseCase)
    await useCase.execute(dogId, update)
  }

  private async handleStateChanged(dogId: string, raw: string): Promise<void> {
    let payload: { state: RobotDogState }

    try {
      payload = await robotStateValidator.validate(JSON.parse(raw))
    } catch {
      logger.warn({ dogId, raw }, 'MqttService: invalid state payload')
      return
    }
    const useCase = await app.container.make(HandleRobotStateChangedUseCase)
    await useCase.execute(dogId, payload.state)
  }

  private async handleConnectionStatus(dogId: string, raw: string): Promise<void> {
    let connectivity: RobotConnectivityEvent

    try {
      connectivity = await robotConnectivityEventValidator.validate(JSON.parse(raw))
    } catch {
      logger.warn({ dogId, raw }, 'MqttService: invalid connectivity payload')
      return
    }

    const useCase = await app.container.make(HandleRobotConnectivityUseCase)
    await useCase.execute(dogId, connectivity)
  }

  private async handleReboot(dogId: string, raw: string): Promise<void> {
    let reboot: RobotRebootEvent

    try {
      reboot = await robotRebootEventValidator.validate(JSON.parse(raw))
    } catch {
      logger.warn({ dogId, raw }, 'MqttService: invalid system/reboot payload')
      return
    }

    const useCase = await app.container.make(HandleRobotRebootUseCase)
    await useCase.execute(dogId, reboot)
  }

  private async handleError(dogId: string, raw: string): Promise<void> {
    let error: RobotErrorEvent

    try {
      error = await robotErrorEventValidator.validate(JSON.parse(raw))
    } catch {
      logger.warn({ dogId, raw }, 'MqttService: invalid error payload')
      return
    }

    const useCase = await app.container.make(HandleRobotErrorUseCase)
    await useCase.execute(dogId, error)
  }
}
