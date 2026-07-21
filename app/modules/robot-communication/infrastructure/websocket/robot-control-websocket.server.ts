import { WebSocketServer, type WebSocket } from 'ws'
import type { Server as HttpServer } from 'node:http'
import type { IncomingMessage } from 'node:http'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { UserRole } from '#users/domain/enums/user.role'
import type { RobotControlHub } from '#app/modules/robot-communication/infrastructure/websocket/robot-control-hub'
import { StartSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-session.use-case'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import { SendDriveCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/send-drive-command.use-case'
import type {
  Throttle,
  Steering,
} from '#app/modules/robot-communication/domain/types/robot-command.type'

const AUTH_TIMEOUT_MS = 5000
const THROTTLE_VALUES: Throttle[] = ['forward', 'backward', 'none']
const STEERING_VALUES: Steering[] = ['left', 'right', 'none']

/**
 * Passerelle WebSocket pour le pilotage temps réel d'un robot ("Control this dog").
 * L'ouverture de la connexion démarre la session (StartSessionCommandUseCase), sa
 * fermeture la termine (EndSessionCommandUseCase) : pas de route HTTP séparée, la
 * connexion EST la session. Le token Firebase n'est jamais mis dans l'URL (illisible
 * en query string côté navigateur pour l'auth custom) : il est envoyé comme premier
 * message applicatif juste après le handshake.
 */
export class RobotControlWebSocketServer {
  private wss?: WebSocketServer

  constructor(private readonly hub: RobotControlHub) {}

  attach(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws/robot-control' })

    this.wss.on('connection', (socket, request) => {
      socket.on('error', (err) => {
        logger.warn({ err }, 'RobotControlWebSocketServer: socket error')
      })

      this.handleConnection(socket, request).catch((err) => {
        logger.error({ err }, 'RobotControlWebSocketServer: unhandled connection error')
        socket.close(1011, 'internal_error')
      })
    })

    logger.info('RobotControlWebSocketServer: attached at /ws/robot-control')
  }

  close(): void {
    this.wss?.close()
  }

  private async handleConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const url = new URL(request.url ?? '', 'http://internal')
    const dogId = url.searchParams.get('dogId')

    if (!dogId) {
      socket.close(4400, 'missing_dog_id')
      return
    }

    const auth = await this.waitForAuth(socket)
    if (!auth) return

    let firebaseUid: string
    try {
      const verifier = await app.container.make(FirebaseTokenVerifier)
      const decoded = await verifier.handle(auth.token)
      firebaseUid = decoded.uid
    } catch {
      socket.close(4401, 'invalid_token')
      return
    }

    const userRepository = await app.container.make(UserReadRepository)
    const user = await userRepository.findByFirebaseUid(firebaseUid)
    if (!user) {
      socket.close(4401, 'user_not_found')
      return
    }

    const dogRepository = await app.container.make(RobotDogRepository)
    const dog = await dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      socket.close(4404, 'robot_not_found')
      return
    }

    if (user.role !== UserRole.ADMIN) {
      const ownershipRepository = await app.container.make(OwnershipReadRepository)
      const isOwner = await ownershipRepository.isOwner(user.id, dogId)
      if (!isOwner) {
        socket.close(4403, 'forbidden')
        return
      }
    }

    if (!this.hub.register(dogId, socket)) {
      socket.close(4409, 'already_controlled')
      return
    }

    try {
      const startSession = await app.container.make(StartSessionCommandUseCase)
      await startSession.execute(dogId)
    } catch (err) {
      logger.warn({ err, dogId }, 'RobotControlWebSocketServer: unable to start session')
      this.hub.unregister(dogId, socket)
      socket.close(4409, 'session_unavailable')
      return
    }

    logger.info({ dogId, userId: user.id }, 'RobotControlWebSocketServer: session started')
    socket.send(JSON.stringify({ type: 'session_started' }))

    socket.on('message', (raw) => {
      this.handleDriveMessage(dogId, raw.toString()).catch((err) => {
        logger.warn({ err, dogId }, 'RobotControlWebSocketServer: failed to handle drive message')
      })
    })

    socket.on('close', () => {
      this.hub.unregister(dogId, socket)
      app.container
        .make(EndSessionCommandUseCase)
        .then((useCase) => useCase.execute(dogId))
        .then(() => logger.info({ dogId }, 'RobotControlWebSocketServer: session ended'))
        .catch((err) => {
          logger.warn({ err, dogId }, 'RobotControlWebSocketServer: unable to end session on close')
        })
    })
  }

  private waitForAuth(socket: WebSocket): Promise<{ token: string } | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.close(4401, 'auth_timeout')
        resolve(null)
      }, AUTH_TIMEOUT_MS)

      socket.once('message', (raw) => {
        clearTimeout(timeout)
        try {
          const payload = JSON.parse(raw.toString())
          if (
            payload?.type === 'auth' &&
            typeof payload.token === 'string' &&
            payload.token.length > 0
          ) {
            resolve({ token: payload.token })
            return
          }
        } catch {
          /* fallthrough vers la fermeture ci-dessous */
        }
        socket.close(4400, 'invalid_auth_message')
        resolve(null)
      })
    })
  }

  private async handleDriveMessage(dogId: string, raw: string): Promise<void> {
    let payload: { type?: string; throttle?: string; steering?: string }
    try {
      payload = JSON.parse(raw)
    } catch {
      return
    }

    if (
      payload.type !== 'drive' ||
      !THROTTLE_VALUES.includes(payload.throttle as Throttle) ||
      !STEERING_VALUES.includes(payload.steering as Steering)
    ) {
      return
    }

    const sendDrive = await app.container.make(SendDriveCommandUseCase)
    await sendDrive.execute(dogId, payload.throttle as Throttle, payload.steering as Steering)
  }
}
