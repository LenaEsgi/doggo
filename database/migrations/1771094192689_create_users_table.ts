import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('firstname').notNullable()
      table.string('lastname').notNullable()
      table.string('email').notNullable().unique()
      table.enu('role', ['admin', 'user']).notNullable().defaultTo('user')

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
