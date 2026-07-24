export abstract class MqttAccountProvisioner {
  abstract provisionRobotAccount(username: string, password: string): Promise<void>
  abstract deprovisionRobotAccount(username: string): Promise<void>
}
