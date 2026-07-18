import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { RobotDogFactory } from '#database/factories/robot-dog-factory'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'

export default class extends BaseSeeder {
  async run() {
    const existing = await RobotDogModel.query().first()
    if (existing) {
      return
    }

    await RobotDogFactory.createMany(10)
  }
}
