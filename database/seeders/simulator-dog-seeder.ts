import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogRepositoryImplementation } from '#dogs/infrastructure/database/repositories/robot-dog.repository.implementation'

const SIMULATOR_DOG_SERIAL_NUMBER = 'SN-SIMULATOR-NOVA'
const SIMULATOR_DOG_NAME = 'Nova'

export default class extends BaseSeeder {
  async run() {
    const dogRepository = new RobotDogRepositoryImplementation()

    const existing = await dogRepository.findBySerialNumber(SIMULATOR_DOG_SERIAL_NUMBER)
    if (existing) {
      return
    }

    const dog = RobotDog.create(SIMULATOR_DOG_SERIAL_NUMBER, SIMULATOR_DOG_NAME, 100)
    await dogRepository.save(dog)
  }
}
