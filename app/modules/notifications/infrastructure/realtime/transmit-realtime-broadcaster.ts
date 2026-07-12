import transmit from '@adonisjs/transmit/services/main'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'

export class TransmitRealtimeBroadcaster extends RealtimeBroadcaster {
  broadcast(channel: string, payload: Record<string, unknown>): void {
    transmit.broadcast(channel, payload as Parameters<typeof transmit.broadcast>[1])
  }
}
