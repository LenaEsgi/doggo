export class InvalidRobotCommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRobotCommandError'
  }
}
