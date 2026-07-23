import type { ApplicationService } from '@adonisjs/core/types'
import server from '@adonisjs/core/services/server'
import { LiveControlGateway } from '#app/modules/robot-communication/domain/contracts/live-control.gateway'
import { SocketIoServiceImplementation } from '#app/modules/robot-communication/infrastructure/socketio/socketio.service.implementation'

export default class SocketIoProvider {
  private socketIoService!: SocketIoServiceImplementation

  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(LiveControlGateway, () => {
      return this.socketIoService
    })
  }

  async boot() {
    this.socketIoService = new SocketIoServiceImplementation()
  }

  async ready() {
    const nodeHttpServer = server.getNodeServer()
    if (!nodeHttpServer) {
      throw new Error('SocketIoProvider: Node HTTP server not available at ready()')
    }

    this.socketIoService.attach(nodeHttpServer)
  }

  async shutdown() {
    await this.socketIoService.detach()
  }
}
