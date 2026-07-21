import type { WebSocket } from 'ws'
import logger from '@adonisjs/core/services/logger'

/**
 * Registre en mémoire des sockets de contrôle actives, une par robot au maximum
 * (un seul opérateur à la fois). Fait le pont entre le flux MQTT (position simulée)
 * et la connexion WebSocket du navigateur qui contrôle ce robot.
 */
export class RobotControlHub {
  private readonly connections = new Map<string, WebSocket>()

  isControlled(dogId: string): boolean {
    return this.connections.has(dogId)
  }

  /** Retourne false si un opérateur contrôle déjà ce robot. */
  register(dogId: string, socket: WebSocket): boolean {
    if (this.connections.has(dogId)) {
      return false
    }
    this.connections.set(dogId, socket)
    return true
  }

  unregister(dogId: string, socket: WebSocket): void {
    if (this.connections.get(dogId) === socket) {
      this.connections.delete(dogId)
    }
  }

  push(dogId: string, payload: Record<string, unknown>): void {
    const socket = this.connections.get(dogId)
    if (!socket || socket.readyState !== socket.OPEN) {
      return
    }
    try {
      socket.send(JSON.stringify(payload))
    } catch (err) {
      logger.warn({ err, dogId }, 'RobotControlHub: failed to push payload')
    }
  }
}
