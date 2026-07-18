import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import { UserFactory } from '#database/factories/user-factory'
import { UserRole } from '#users/domain/enums/user.role'
import UserModel from '#users/infrastructure/database/models/user'

export default class extends BaseSeeder {
  async run() {
    // Le seed complet (dont les 100 users aléatoires) n'a besoin de tourner
    // qu'une fois : on le détecte via l'existence du user admin de seed.
    const alreadySeeded = await UserModel.query().where('email', 'admin@doggo.local').first()

    await this.ensureUser({
      firstname: 'Admin',
      lastname: 'Doggo',
      email: 'admin@doggo.local',
      firebaseUid: 'seed-admin-doggo',
      role: UserRole.ADMIN,
    })

    await this.ensureUser({
      firstname: 'arthur',
      lastname: 'morelon',
      email: 'arthur.morelon@gmail.com',
      firebaseUid: env.get('SEED_ARTHUR_FIREBASE_UID') ?? 'seed-arthur-doggo',
      role: UserRole.USER,
    })

    await this.ensureUser({
      firstname: 'robo',
      lastname: 'dog',
      email: 'robotdogprojetannuel@yopmail.com',
      firebaseUid: env.get('SEED_ROBO_FIREBASE_UID') ?? 'seed-robo-doggo',
      role: UserRole.ADMIN,
    })

    if (!alreadySeeded) {
      await UserFactory.merge({ role: UserRole.USER }).createMany(100)
    }
  }

  private async ensureUser(attrs: {
    firstname: string
    lastname: string
    email: string
    firebaseUid: string
    role: UserRole
  }) {
    const existing = await UserModel.query().where('email', attrs.email).first()
    if (existing) {
      return existing
    }

    return UserFactory.merge(attrs).create()
  }
}
