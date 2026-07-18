import { randomUUID } from 'node:crypto'
import { type DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { type MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { type MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

export class MissionScheduleFiringRepositoryImplementation implements MissionScheduleFiringRepository {
  async tryClaim(missionScheduleId: string, firedForMinute: DateTime): Promise<boolean> {
    // db.table(...).insert(...) returns Lucid's InsertQueryBuilder, which does NOT expose
    // .onConflict() (verified against @adonisjs/lucid@22 source: its InsertQueryBuilder only
    // forwards table/withSchema/returning/insert/multiInsert/debug/timeout, nothing else).
    // db.knexQuery() returns the underlying raw Knex query builder, which does support
    // .onConflict().ignore() natively — use that escape hatch for this one query.
    const rows = await db
      .knexQuery()
      .from('mission_schedule_firings')
      .insert({
        id: randomUUID(),
        mission_schedule_id: missionScheduleId,
        fired_for_minute: firedForMinute.toSQL()!,
      })
      .onConflict(['mission_schedule_id', 'fired_for_minute'])
      .ignore()
      .returning('id')

    return rows.length > 0
  }

  async recordOutcome(
    missionScheduleId: string,
    firedForMinute: DateTime,
    outcome: MissionScheduleFiringOutcome,
    missionRunId: string | null
  ): Promise<void> {
    await db
      .from('mission_schedule_firings')
      .where('mission_schedule_id', missionScheduleId)
      .where('fired_for_minute', firedForMinute.toSQL()!)
      .update({ outcome, mission_run_id: missionRunId })
  }
}
