import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ownerships'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.uuid('robot_dog_id').references('id').inTable('robot_dogs').onDelete('CASCADE')

      table.timestamp('start_date').notNullable()
      table.timestamp('end_date')

      table.primary(['user_id', 'robot_dog_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
