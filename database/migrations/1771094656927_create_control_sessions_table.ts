import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'control_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')

      table.uuid('robot_dog_id').references('id').inTable('robot_dogs').onDelete('CASCADE')

      table.timestamp('start_time').notNullable()
      table.timestamp('end_time')
      table.enum('status', ['ACTIVE', 'FINISHED', 'EXPIRED']).notNullable().defaultTo('ACTIVE')

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
