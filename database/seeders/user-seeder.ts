import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import { UserFactory } from '#database/factories/user-factory'
import { UserRole } from '#users/domain/enums/user.role'

export default class extends BaseSeeder {
  async run() {
    await UserFactory.merge({
      firstname: 'Admin',
      lastname: 'Doggo',
      email: 'admin@doggo.local',
      firebaseUid: 'seed-admin-doggo',
      role: UserRole.ADMIN,
    }).create()

    await UserFactory.merge({
      firstname: 'arthur',
      lastname: 'morelon',
      email: 'arthur.morelon@gmail.com',
      firebaseUid: env.get('SEED_ARTHUR_FIREBASE_UID') ?? 'seed-arthur-doggo',
      role: UserRole.USER,
    }).create()

    await UserFactory.merge({
      firstname: 'robo',
      lastname: 'dog',
      email: 'robotdogprojetannuel@yopmail.com',
      firebaseUid: env.get('SEED_ROBO_FIREBASE_UID') ?? 'seed-robo-doggo',
      role: UserRole.USER,
    }).create()

    await UserFactory.merge({ role: UserRole.USER }).createMany(100)
  }
}
