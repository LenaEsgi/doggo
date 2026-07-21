import type { ApplicationService } from '@adonisjs/core/types'
import { RobotControlHub } from '#app/modules/robot-communication/infrastructure/websocket/robot-control-hub'
import { RobotControlWebSocketServer } from '#app/modules/robot-communication/infrastructure/websocket/robot-control-websocket.server'

export default class RobotControlWebSocketProvider {
  private wsServer?: RobotControlWebSocketServer

  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(RobotControlHub, () => new RobotControlHub())
  }

  async ready() {
    if (this.app.getEnvironment() !== 'web') {
      return
    }

    const server = await import('@adonisjs/core/services/server')
    const nodeServer = server.default.getNodeServer()
    if (!nodeServer) {
      return
    }

    const hub = await this.app.container.make(RobotControlHub)
    this.wsServer = new RobotControlWebSocketServer(hub)
    this.wsServer.attach(nodeServer)
  }

  async shutdown() {
    this.wsServer?.close()
  }
}
