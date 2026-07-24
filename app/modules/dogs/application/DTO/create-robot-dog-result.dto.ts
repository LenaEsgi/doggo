import { type RobotDog } from '#app/modules/dogs/domain/robot-dog.entity'

export class CreateRobotDogResult {
  constructor(
    public readonly robotDog: RobotDog,
    public readonly mqttPassword: string
  ) {}
}
