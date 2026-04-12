import { BaseSeeder } from '@adonisjs/lucid/seeders'
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

    await UserFactory.merge({ role: UserRole.USER }).createMany(20)
  }
}
