export abstract class MissionTimeoutQueue {
  abstract schedule(runId: string, dogId: string, delayMs: number): Promise<void>
  abstract cancel(runId: string): Promise<void>
}
