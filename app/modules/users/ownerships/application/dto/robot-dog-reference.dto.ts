import type { RobotDog } from '#dogs/domain/robot-dog.entity'

export type RobotDogReferenceDto = {
  robotDog: RobotDog
  usersCount: number
}
