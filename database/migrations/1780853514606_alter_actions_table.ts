import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'actions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('parameter_schema').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('parameter_schema')
    })
  }
}
