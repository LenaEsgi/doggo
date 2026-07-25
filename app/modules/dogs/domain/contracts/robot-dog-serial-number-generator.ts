export abstract class RobotDogSerialNumberGenerator {
  abstract generate(): Promise<string>
}
