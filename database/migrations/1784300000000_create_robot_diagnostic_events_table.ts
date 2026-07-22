import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'robot_diagnostic_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('dog_id').notNullable().references('id').inTable('robot_dogs').onDelete('CASCADE')
      table.string('type').notNullable()
      table.string('severity').notNullable()
      table.jsonb('payload').notNullable()
      table.timestamp('occurred_at').notNullable()
      table.timestamp('created_at').notNullable()

      table.index(['dog_id', 'occurred_at'])
      table.index(['type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
