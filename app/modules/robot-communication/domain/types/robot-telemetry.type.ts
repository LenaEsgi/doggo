import { type RobotDogState } from '#dogs/domain/enums/robot-dog.state'

export interface RobotTelemetry {
  battery: number
  state?: RobotDogState
}
