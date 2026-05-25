export default class OwnershipAssignedEvent {
  constructor(
    public readonly userId: string,
    public readonly robotDogId: string
  ) {}
}
