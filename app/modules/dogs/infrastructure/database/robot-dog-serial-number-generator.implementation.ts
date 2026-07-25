import db from '@adonisjs/lucid/services/db'
import { RobotDogSerialNumberGenerator } from '#dogs/domain/contracts/robot-dog-serial-number-generator'

export class RobotDogSerialNumberGeneratorImplementation extends RobotDogSerialNumberGenerator {
  private static readonly PAD_LENGTH = 6

  async generate(): Promise<string> {
    const result = await db.rawQuery<{ rows: Array<{ value: string | number }> }>(
      "SELECT nextval('robot_dogs_serial_seq') as value"
    )
    const sequenceValue = result.rows[0].value

    return `SN-${sequenceValue.toString().padStart(RobotDogSerialNumberGeneratorImplementation.PAD_LENGTH, '0')}`
  }
}
