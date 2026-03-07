import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { RobotDogState } from '../../../domain/enums/robot-dog.state.js'

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

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare lastHeartbeat?: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
