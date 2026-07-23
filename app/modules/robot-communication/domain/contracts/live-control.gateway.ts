export abstract class LiveControlGateway {
  abstract relayCommand(
    dogId: string,
    payload: { actionCode: string; parameters: Record<string, unknown> }
  ): Promise<void>
}
