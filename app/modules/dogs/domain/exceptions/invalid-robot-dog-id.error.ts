export class InvalidRobotDogIdError extends Error {
  constructor(value: string) {
    super(`Invalid RobotDogId: "${value}"`)
  }
}
