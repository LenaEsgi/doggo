import { RobotDogRepository } from '../../../domain/contracts/robot_dog.repository.js'
import { RobotDog } from '../../../domain/robot_dog.entity.js'
import RobotDogModel from '../models/robot_dog.js'
import { RobotDogState } from '../../../domain/enums/robot_dog.state.js'
import { DateTime } from 'luxon'
import { RobotDogId } from '../../../domain/value-objects/robot-dog-id.js'

export class RobotDogRepositoryImplementation implements RobotDogRepository {
  async findById(id: RobotDogId): Promise<RobotDog | null> {
    const row = await RobotDogModel.find(id.value)

    if (!row) return null

    return RobotDog.rehydrate(
      row.id,
      row.serialNumber,
      row.state as RobotDogState,
      row.batteryLevel,
      row.lastHeartbeat?.toJSDate() ? row.lastHeartbeat?.toJSDate() : DateTime.now().toJSDate()
    )
  }
  async findAll(): Promise<RobotDog[]> {
    const rows = await RobotDogModel.all()

    return rows.map((row) =>
      RobotDog.rehydrate(
        row.id,
        row.serialNumber,
        row.state as RobotDogState,
        row.batteryLevel,
        row.lastHeartbeat?.toJSDate() ? row.lastHeartbeat?.toJSDate() : DateTime.now().toJSDate()
      )
    )
  }
  async save(dog: RobotDog): Promise<void> {
    await RobotDogModel.updateOrCreate(
      { id: dog.id.value },
      {
        serialNumber: dog.serialNumber,
        state: dog.state,
        batteryLevel: dog.batteryLevel,
        lastHeartbeat: DateTime.fromJSDate(dog.lastHeartbeat),
      }
    )
  }

  async delete(id: RobotDogId): Promise<void> {
    const row = await RobotDogModel.findOrFail(id.value)
    await row.delete()
  }
}
