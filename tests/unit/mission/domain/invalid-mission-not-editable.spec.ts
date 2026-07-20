import { test } from '@japa/runner'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'

test.group('InvalidMissionNotEditableError', () => {
  test('builds without a status argument', ({ assert }) => {
    const error = new InvalidMissionNotEditableError()
    assert.equal(error.name, 'MissionNotEditableError')
    assert.equal(
      error.message,
      'Mission cannot be modified while a run is active on at least one robot'
    )
  })
})
