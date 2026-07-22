import { LiveControlGateway } from '#app/modules/robot-communication/domain/contracts/live-control.gateway'

export class FakeLiveControlGateway extends LiveControlGateway {
  public calls: { dogId: string; actionCode: string; parameters: Record<string, unknown> }[] = []
  public shouldFail = false

  async relayCommand(
    dogId: string,
    payload: { actionCode: string; parameters: Record<string, unknown> }
  ): Promise<void> {
    if (this.shouldFail) {
      throw new Error('SocketIoService: not attached')
    }
    this.calls.push({ dogId, actionCode: payload.actionCode, parameters: payload.parameters })
  }
}
