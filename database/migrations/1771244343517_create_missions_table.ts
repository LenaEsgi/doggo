import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.uuid('robot_dog_id').references('id').inTable('robot_dogs').onDelete('CASCADE')

      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')

      table.string('name').notNullable()
      table.string('status').notNullable()

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
