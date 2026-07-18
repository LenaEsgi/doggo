import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_schedules'

  async up() {
    this.schema.dropTable(this.tableName)

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
      table.specificType('days_of_week', 'smallint[]').notNullable()
      table.smallint('hour').notNullable()
      table.smallint('minute').notNullable()
      table.boolean('enabled').notNullable().defaultTo(true)
      table.index(['mission_id'])

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)

    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('mission_id').unique().references('id').inTable('missions').onDelete('CASCADE')
      table.timestamp('planned_at').notNullable()

      table.timestamps(true, true)
    })
  }
}
