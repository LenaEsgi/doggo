export class InvalidRobotDogNameError extends Error {
  constructor(name: string) {
    super(`RobotDog name is invalid: "${name}"`)
  }
}
