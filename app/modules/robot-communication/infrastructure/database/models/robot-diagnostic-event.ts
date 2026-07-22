import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class RobotDiagnosticEventModel extends BaseModel {
  public static table = 'robot_diagnostic_events'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare dogId: string

  @column()
  declare type: string

  @column()
  declare severity: string

  @column()
  declare payload: Record<string, unknown>

  @column.dateTime()
  declare occurredAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
