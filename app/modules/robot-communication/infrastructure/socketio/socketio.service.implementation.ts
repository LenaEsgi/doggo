import type { Server as HttpServer } from 'node:http'
import type { Server as HttpsServer } from 'node:https'
import { Server as SocketIOServer } from 'socket.io'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { LiveControlGateway } from '#app/modules/robot-communication/domain/contracts/live-control.gateway'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogKey } from '#dogs/domain/value-objects/robot-dog-key'
import { UserRole } from '#users/domain/enums/user.role'
import { DispatchLiveCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/dispatch-live-command.use-case'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import { endSessionOnOperatorDisconnect } from '#app/modules/robot-communication/infrastructure/socketio/end-session-on-operator-disconnect'
import { DomainError } from '#app/modules/share/exceptions/domain-error'

type CommandAck = { ok: true } | { ok: false; error: string; message: string }

interface OperatorSocketData {
  userId: string
  dogId: string
}

interface RobotSocketData {
  dogId: string
}

/**
 * Hub WS unique du backend : le navigateur (namespace /ws/operators) et le
 * robot/simulateur (namespace /ws/robots, ajouté en phase 5) s'y connectent
 * tous les deux en tant que clients, routés par room `dog:{dogId}`.
 */
export class SocketIoServiceImplementation extends LiveControlGateway {
  private io: SocketIOServer | undefined

  attach(httpServer: HttpServer | HttpsServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.get('FRONTEND_URL'),
        credentials: true,
      },
      // Détecte une coupure réseau silencieuse (wifi qui lâche sans fermeture propre du
      // socket) en ~15s au lieu des ~45s par défaut, pour couper la session live au plus vite.
      pingInterval: 10_000,
      pingTimeout: 5_000,
    })

    const operators = this.io.of('/ws/operators')

    operators.use(async (socket, next) => {
      try {
        const { token, dogId } = socket.handshake.auth as { token?: string; dogId?: string }

        if (!token || !dogId) {
          next(new Error('token and dogId are required'))
          return
        }

        const tokenVerifier = await app.container.make(FirebaseTokenVerifier)
        const userRepository = await app.container.make(UserReadRepository)
        const ownershipRepository = await app.container.make(OwnershipReadRepository)
        const dogRepository = await app.container.make(RobotDogRepository)

        const decoded = await tokenVerifier.handle(token)
        const user = await userRepository.findByFirebaseUid(decoded.uid)
        if (!user) {
          next(new Error('user not found'))
          return
        }

        const dog = await dogRepository.findById(RobotDogId.fromString(dogId))
        if (!dog) {
          next(new Error('robot dog not found'))
          return
        }

        const isOwner = await ownershipRepository.isOwner(user.id, dogId)
        if (user.role !== UserRole.ADMIN && !isOwner) {
          next(new Error('not authorized for this robot dog'))
          return
        }

        const data: OperatorSocketData = { userId: user.id, dogId }
        socket.data = data
        next()
      } catch (error) {
        logger.warn({ err: error }, 'SocketIoService: operator handshake rejected')
        next(new Error('authentication failed'))
      }
    })

    operators.on('connection', (socket) => {
      const { dogId } = socket.data as OperatorSocketData

      socket.join(`dog:${dogId}`)
      logger.info({ dogId, socketId: socket.id }, 'SocketIoService: operator connected')

      socket.on('command', async (payload: unknown, ack?: (response: CommandAck) => void) => {
        try {
          const { actionCode, parameters } = (payload ?? {}) as {
            actionCode?: string
            parameters?: Record<string, unknown>
          }

          if (!actionCode || typeof actionCode !== 'string') {
            ack?.({ ok: false, error: 'INVALID_PAYLOAD', message: 'actionCode is required' })
            return
          }

          const dispatchLiveCommand = await app.container.make(DispatchLiveCommandUseCase)
          await dispatchLiveCommand.execute(dogId, actionCode, parameters ?? {})

          ack?.({ ok: true })
        } catch (error) {
          if (error instanceof DomainError) {
            ack?.({ ok: false, error: error.code, message: error.message })
            return
          }

          logger.error(
            { err: error, dogId },
            'SocketIoService: unexpected error dispatching live command'
          )
          ack?.({ ok: false, error: 'INTERNAL_ERROR', message: 'Unexpected error' })
        }
      })

      socket.on('disconnect', () => {
        logger.info({ dogId, socketId: socket.id }, 'SocketIoService: operator disconnected')

        // La room a déjà exclu ce socket à ce stade (Socket.IO le fait avant d'émettre
        // 'disconnect') : si elle est vide, plus aucun onglet opérateur ne pilote ce chien.
        const room = operators.adapter.rooms.get(`dog:${dogId}`)
        const roomIsEmpty = !room || room.size === 0

        void app.container
          .make(EndSessionCommandUseCase)
          .then((endSession) => endSessionOnOperatorDisconnect(dogId, roomIsEmpty, endSession))
      })
    })

    const robots = this.io.of('/ws/robots')

    robots.use(async (socket, next) => {
      try {
        const { dogId, deviceKey } = socket.handshake.auth as {
          dogId?: string
          deviceKey?: string
        }

        if (!dogId || !deviceKey) {
          next(new Error('dogId and deviceKey are required'))
          return
        }

        const dogRepository = await app.container.make(RobotDogRepository)
        const dog = await dogRepository.findById(RobotDogId.fromString(dogId))

        if (!dog) {
          next(new Error('robot dog not found'))
          return
        }

        if (!dog.key.equals(RobotDogKey.fromString(deviceKey))) {
          next(new Error('invalid device key'))
          return
        }

        const data: RobotSocketData = { dogId }
        socket.data = data
        next()
      } catch (error) {
        logger.warn({ err: error }, 'SocketIoService: robot handshake rejected')
        next(new Error('authentication failed'))
      }
    })

    robots.on('connection', (socket) => {
      const { dogId } = socket.data as RobotSocketData

      socket.join(`dog:${dogId}`)
      logger.info({ dogId, socketId: socket.id }, 'SocketIoService: robot connected')

      socket.on('disconnect', () => {
        logger.info({ dogId, socketId: socket.id }, 'SocketIoService: robot disconnected')
      })
    })
  }

  async relayCommand(
    dogId: string,
    payload: { actionCode: string; parameters: Record<string, unknown> }
  ): Promise<void> {
    if (!this.io) {
      throw new Error('SocketIoService: not attached')
    }

    this.io.of('/ws/robots').to(`dog:${dogId}`).emit('command', payload)
  }

  async detach(): Promise<void> {
    if (this.io) {
      await this.io.close()
      this.io = undefined
    }
  }
}
