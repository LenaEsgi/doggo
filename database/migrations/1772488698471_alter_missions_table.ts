import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('robot_dog_id')
      table.dropNullable('user_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {})
  }
}
