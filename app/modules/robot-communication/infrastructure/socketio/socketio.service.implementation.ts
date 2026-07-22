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
import { UserRole } from '#users/domain/enums/user.role'

interface OperatorSocketData {
  userId: string
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

      socket.on('command', (_payload: unknown, ack?: (response: unknown) => void) => {
        ack?.({
          ok: false,
          error: 'NOT_IMPLEMENTED',
          message: 'Live command dispatch lands in a later phase',
        })
      })

      socket.on('disconnect', () => {
        logger.info({ dogId, socketId: socket.id }, 'SocketIoService: operator disconnected')
      })
    })
  }

  async relayCommand(): Promise<void> {
    throw new Error('LiveControlGateway.relayCommand: /ws/robots namespace not wired yet')
  }

  async detach(): Promise<void> {
    if (this.io) {
      await this.io.close()
      this.io = undefined
    }
  }
}
