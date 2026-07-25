import { randomBytes } from 'node:crypto'

export class MqttAccountPassword {
  private constructor(public readonly value: string) {}

  private static readonly BYTE_LENGTH = 24

  public static generate(): MqttAccountPassword {
    return new MqttAccountPassword(randomBytes(MqttAccountPassword.BYTE_LENGTH).toString('base64url'))
  }
}
