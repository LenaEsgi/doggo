import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_robot_dog'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
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

      table.primary(['mission_id', 'robot_dog_id'])
      table.index(['robot_dog_id', 'mission_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
