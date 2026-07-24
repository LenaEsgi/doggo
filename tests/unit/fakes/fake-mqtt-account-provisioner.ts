import { MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'

export class FakeMqttAccountProvisioner extends MqttAccountProvisioner {
  public provisionedAccounts: { username: string; password: string }[] = []
  public deprovisionedUsernames: string[] = []
  public shouldFailProvisioning = false

  async provisionRobotAccount(username: string, password: string): Promise<void> {
    if (this.shouldFailProvisioning) {
      throw new Error('dynsec createClient failed: role not found')
    }
    this.provisionedAccounts.push({ username, password })
  }

  async deprovisionRobotAccount(username: string): Promise<void> {
    this.deprovisionedUsernames.push(username)
  }
}
