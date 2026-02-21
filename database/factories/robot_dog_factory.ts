import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import Factory from '@adonisjs/lucid/factories'
import { randomBytes } from 'node:crypto'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { DateTime } from 'luxon'

function generateRandomKey(length = 18) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const bytes = randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

export const RobotDogFactory = Factory
  .define(RobotDogModel, ({ faker }) => {
    return {
      serial_number: `SN-${faker.number.int({ min: 100000, max: 9999999999999 })}`,
      key: generateRandomKey(),
      name: faker.animal.petName(),
      state: RobotDogState.IDLE,
      battery_level: faker.number.int({ min: 10, max: 100 }),
      last_heartbeat: DateTime.fromJSDate(faker.date.recent()),
    }
  })
  .build()
