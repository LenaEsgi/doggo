import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import UserModel from '#users/infrastructure/database/models/user'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'

export default class RobotDogModel extends BaseModel {
  public static table = 'robot_dogs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare serialNumber: string

  @column()
  declare key: string

  @column()
  declare name: string

  @column()
  declare state: RobotDogState

  @column()
  declare batteryLevel: number

  @column()
  declare firmwareVersion: string

  @manyToMany(() => MissionModel, {
    pivotTable: 'mission_robot_dog',
    localKey: 'id',
    pivotForeignKey: 'robot_dog_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'mission_id',
  })
  declare missions: ManyToMany<typeof MissionModel>

  @manyToMany(() => UserModel, {
    pivotTable: 'ownerships',
    pivotForeignKey: 'robot_dog_id',
    pivotRelatedForeignKey: 'user_id',
    pivotColumns: ['start_date', 'end_date'],
  })
  declare users: ManyToMany<typeof UserModel>

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare lastHeartbeat?: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
