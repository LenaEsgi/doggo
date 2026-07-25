import type { ApplicationService } from '@adonisjs/core/types'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'
import { MqttServiceImplementation } from '#app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation'

export default class MqttProvider {
  private mqttService!: MqttServiceImplementation

  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(RobotCommunicationService, () => {
      return this.mqttService
    })
    this.app.container.bind(MqttAccountProvisioner, () => {
      return this.mqttService
    })
  }

  async boot() {
    this.mqttService = new MqttServiceImplementation()
  }

  async ready() {
    await this.mqttService.connect()
  }

  async shutdown() {
    await this.mqttService.disconnect()
  }
}
