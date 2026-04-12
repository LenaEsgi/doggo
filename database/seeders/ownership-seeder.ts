import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import { RobotDogFactory } from '#database/factories/robot-dog-factory'
import { UserFactory } from '#database/factories/user-factory'
import OwnershipModel from '#app/modules/users/ownerships/infrastructure/database/models/ownership'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import UserModel from '#users/infrastructure/database/models/user'

export default class extends BaseSeeder {
  async run() {
    const users = await this.ensureUsers()
    const robotDogs = await this.ensureRobotDogs()

    await OwnershipModel.query().delete()

    const ownerships = []
    const pairCount = Math.min(12, users.length * robotDogs.length)

    for (let index = 0; index < pairCount; index++) {
      const user = users[index % users.length]
      const robotDog = robotDogs[(index * 2) % robotDogs.length]
      const startDate = DateTime.now().minus({ days: 60 + index * 3 })
      const endDate = index % 2 === 0 ? null : startDate.plus({ days: 14 })

      ownerships.push({
        userId: user.id,
        robotDogId: robotDog.id,
        startDate,
        endDate,
      })
    }

    await OwnershipModel.createMany(ownerships)
  }

  private async ensureUsers(): Promise<UserModel[]> {
    const users = await UserModel.query().limit(6)
    if (users.length > 0) {
      return users
    }

    return UserFactory.createMany(6)
  }

  private async ensureRobotDogs(): Promise<RobotDogModel[]> {
    const robotDogs = await RobotDogModel.query().limit(6)
    if (robotDogs.length > 0) {
      return robotDogs
    }

    return RobotDogFactory.createMany(6)
  }
}


