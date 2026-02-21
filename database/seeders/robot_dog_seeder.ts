import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { RobotDogFactory } from '#database/factories/robot_dog_factory'

export default class extends BaseSeeder {
  async run() {
    await RobotDogFactory.createMany(10)
  }
}
