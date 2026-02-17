import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import { UserRole } from '../../../domain/enums/user.role.js'

export default class UserModel extends BaseModel {
  public static table = 'users'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare firstname: string

  @column()
  declare lastname: string

  @column()
  declare email: string

  @column()
  declare role: UserRole

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(user: UserModel) {
    user.id = randomUUID()
  }
}
