
export class RobotDogNotFoundError extends Error {
  constructor(id: string) {
    super(`RobotDog with id ${id} not found`)
  }
}
