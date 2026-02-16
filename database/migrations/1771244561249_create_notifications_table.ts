import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('robot_dog_id').references('id').inTable('robot_dogs').onDelete('CASCADE')
      table.string('type').notNullable()
      table.boolean('is_read').defaultTo(false)

      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
