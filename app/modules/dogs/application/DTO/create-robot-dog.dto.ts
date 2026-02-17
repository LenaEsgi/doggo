export class CreateRobotDogDto {
  constructor(
    public readonly id: string,
    public readonly serialNumber: string,
    public readonly name: string,
    public readonly batteryLevel: number
  ) {}
}
