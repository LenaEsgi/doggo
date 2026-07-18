export abstract class RealtimeBroadcaster {
  abstract broadcast(channel: string, payload: Record<string, unknown>): void
}
