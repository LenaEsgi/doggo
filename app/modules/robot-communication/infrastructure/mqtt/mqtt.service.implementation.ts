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
import { type MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'

type DynamicSecurityResponse = {
  responses: { command: string; error?: string }[]
}

export class MqttServiceImplementation implements RobotCommunicationService, MqttAccountProvisioner {
  private static readonly CONTROL_TOPIC = '$CONTROL/dynamic-security/v1'
  private static readonly CONTROL_RESPONSE_TOPIC = '$CONTROL/dynamic-security/v1/response'
  private static readonly CONTROL_TIMEOUT_MS = 5000

  private client!: MqttClient
  private controlMutex: Promise<void> = Promise.resolve()
  // KNOWN LIMITATION (accepted, not fixed): Mosquitto's Dynamic Security control protocol has no
  // request/response correlation id in its response payload (it would require upgrading this
  // client's `protocolVersion` to 5 and using MQTT5 `correlationData`/`responseTopic`, which is
  // out of scope here). This class fakes correlation with a single in-flight slot
  // (`pendingControlRequest`) guarded by `controlMutex`. The race: if command A's control request
  // times out (see the `setTimeout` in `sendDynamicSecurityCommand`), the timeout clears
  // `pendingControlRequest` and releases the lock immediately, WITHOUT waiting to see whether the
  // broker's (now-stale) response to A is still in flight. If command B then acquires the lock and
  // installs its own `pendingControlRequest`, and only THEN does A's delayed response arrive,
  // `handleDynamicSecurityResponse` has no way to tell it belongs to A rather than B — it will
  // incorrectly resolve/reject B's promise using A's result.
  // Accepted because: this only affects admin-triggered robot CRUD (provision/deprovision), which
  // is low-volume, and a real fix would require either (a) holding the lock until a drain period
  // elapses or the stale response is explicitly observed and discarded, or (b) upgrading to MQTT5
  // and correlating requests/responses via `correlationData`/`responseTopic` — both materially more
  // complex than this window justifies today. Revisit if control-command volume/concurrency grows.
  private pendingControlRequest: {
    resolve: (response: DynamicSecurityResponse) => void
    reject: (error: Error) => void
  } | null = null

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
    await this.client.subscribeAsync(MqttServiceImplementation.CONTROL_RESPONSE_TOPIC)

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

  async provisionRobotAccount(username: string, password: string): Promise<void> {
    await this.sendDynamicSecurityCommand({
      command: 'createClient',
      username,
      password,
      roles: [{ rolename: 'robot' }],
    })
    logger.info({ username }, 'MqttService: robot MQTT account provisioned')
  }

  async deprovisionRobotAccount(username: string): Promise<void> {
    // Idempotent revoke: the goal of deprovisioning is "no active MQTT account remains" for
    // this robot, and an account that is already absent already satisfies that goal. This
    // matters because robots created before this dynamic-security feature shipped (via the old
    // manual `mosquitto_passwd` process) have no corresponding dynsec client, and robots may
    // also be deprovisioned twice (e.g. retried operations). Without this, `deleteClient` on a
    // nonexistent client throws, and `DestroyRobotDogUseCase` calls this before the DB delete —
    // so those robots would become permanently undeletable from the admin back-office.
    //
    // CAVEAT: the substrings below have NOT been verified against a live Mosquitto broker with
    // the Dynamic Security plugin — this environment has no bootstrapped broker to test against.
    // Once Mosquitto Dynamic Security is bootstrapped per `docs/mqtt-dynamic-security-activation.md`,
    // confirm this by manually triggering `deleteClient` on a client that does not exist, reading
    // the actual `error` string the broker returns (it will be logged by this catch block via
    // the "already absent" log line below, or will surface as an uncaught throw if it doesn't
    // match), and adjusting this substring list if it does not match reality.
    try {
      await this.sendDynamicSecurityCommand({ command: 'deleteClient', username })
      logger.info({ username }, 'MqttService: robot MQTT account deprovisioned')
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : ''
      const alreadyAbsent = ['not found', 'unknown client', 'does not exist'].some((substring) =>
        message.includes(substring)
      )

      if (!alreadyAbsent) {
        throw error
      }

      logger.info({ username }, 'MqttService: robot MQTT account already absent, treated as deprovisioned')
    }
  }

  private async withControlLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.controlMutex.then(fn, fn)
    this.controlMutex = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  private async sendDynamicSecurityCommand(command: Record<string, unknown>): Promise<void> {
    return this.withControlLock(async () => {
      if (!this.client?.connected) {
        throw new Error('MQTT client is not connected')
      }

      const responsePromise = new Promise<DynamicSecurityResponse>((resolve, reject) => {
        this.pendingControlRequest = { resolve, reject }
      })

      // See the KNOWN LIMITATION comment on `pendingControlRequest` above: releasing
      // `pendingControlRequest` (and the lock, via `withControlLock`) here on timeout — without
      // waiting to confirm the broker's stale response never arrives — is what opens the
      // cross-request race window. Accepted tradeoff, documented there.
      const timeout = setTimeout(() => {
        if (this.pendingControlRequest) {
          this.pendingControlRequest.reject(new Error('Dynamic security control command timed out'))
          this.pendingControlRequest = null
        }
      }, MqttServiceImplementation.CONTROL_TIMEOUT_MS)

      try {
        await this.client.publishAsync(
          MqttServiceImplementation.CONTROL_TOPIC,
          JSON.stringify({ commands: [command] }),
          { qos: 1 }
        )

        const response = await responsePromise
        const [result] = response.responses

        if (result?.error) {
          throw new Error(result.error)
        }
      } finally {
        clearTimeout(timeout)
      }
    })
  }

  private handleDynamicSecurityResponse(raw: string): void {
    if (!this.pendingControlRequest) return

    const { resolve, reject } = this.pendingControlRequest
    this.pendingControlRequest = null

    try {
      resolve(JSON.parse(raw) as DynamicSecurityResponse)
    } catch (err) {
      reject(new Error(`Invalid dynamic security response payload: ${String(err)}`))
    }
  }

  private async handleMessage(topic: string, rawPayload: Buffer): Promise<void> {
    if (topic === MqttServiceImplementation.CONTROL_RESPONSE_TOPIC) {
      this.handleDynamicSecurityResponse(rawPayload.toString())
      return
    }

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
