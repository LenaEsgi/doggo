import { BaseTransformer } from '@adonisjs/core/transformers'
import { type RobotDog } from '#dogs/domain/robot-dog.entity'

export default class RobotDogTransformer extends BaseTransformer<RobotDog> {
  toObject() {
    return {
      id: this.resource.id.value,
      name: this.resource.name,
      state: this.resource.state,
      batteryLevel: this.resource.batteryLevel,
      lastHeartbeat: this.resource.lastHeartbeat,
      firmwareVersion: this.resource.firmwareVersion,
    }
  }
}
