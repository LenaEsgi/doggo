import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class OwnershipModel extends BaseModel {
  public static table = 'ownerships'

  @column({ columnName: 'user_id', isPrimary: true })
  declare userId: string

  @column({ columnName: 'robot_dog_id', isPrimary: true })
  declare robotDogId: string

  @column.dateTime({ columnName: 'start_date', autoCreate: false, autoUpdate: false })
  declare startDate: DateTime

  @column.dateTime({ columnName: 'end_date', autoCreate: false, autoUpdate: false })
  declare endDate: DateTime | null
}
