import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE UNIQUE INDEX one_active_run_per_dog
      ON mission_runs (robot_dog_id)
      WHERE status IN ('PENDING', 'RUNNING')
    `)
  }

  async down() {
    this.schema.raw(`DROP INDEX IF EXISTS one_active_run_per_dog`)
  }
}
