import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .uuid('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .notNullable()
        .after('id')
      table.dropForeign('robot_dog_id')
      table
        .uuid('robot_dog_id')
        .references('id')
        .inTable('robot_dogs')
        .onDelete('SET NULL')
        .nullable()
        .alter()
      table.jsonb('payload').nullable().after('type')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('user_id')
      table.dropColumn('payload')
      table.dropForeign('robot_dog_id')

      table
        .uuid('robot_dog_id')
        .references('id')
        .inTable('robot_dogs')
        .onDelete('CASCADE')
        .notNullable()
        .alter()
    })
  }
}
