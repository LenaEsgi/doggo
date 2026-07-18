import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_runs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('mission_id')
        .notNullable()
        .references('id')
        .inTable('missions')
        .onDelete('CASCADE')
      table
        .uuid('robot_dog_id')
        .notNullable()
        .references('id')
        .inTable('robot_dogs')
        .onDelete('CASCADE')
      table.string('status').notNullable()
      table.timestamp('started_at').notNullable()
      table.timestamp('ended_at').nullable()
      table.index(['mission_id', 'robot_dog_id', 'status'])

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
