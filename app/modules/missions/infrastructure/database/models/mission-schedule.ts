import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class MissionScheduleModel extends BaseModel {
  public static table = 'mission_schedules'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare missionId: string

  @column()
  declare robotDogId: string

  @column()
  declare daysOfWeek: number[]

  @column()
  declare hour: number

  @column()
  declare minute: number

  @column()
  declare enabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
