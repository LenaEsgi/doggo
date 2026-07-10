import { test } from '@japa/runner'
import { MissionRunId } from '#app/modules/missions/domain/value-objects/mission-run-id'
import { InvalidMissionRunIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-run-id.error'

test.group('MissionRunId', () => {
  test('generates a valid id', ({ assert }) => {
    const id = MissionRunId.generate()
    assert.isString(id.value)
  })

  test('rejects an invalid uuid', ({ assert }) => {
    assert.throws(() => MissionRunId.fromString('not-a-uuid'), InvalidMissionRunIdError)
  })

  test('two ids with the same value are equal', ({ assert }) => {
    const id = MissionRunId.generate()
    assert.isTrue(id.equals(MissionRunId.fromString(id.value)))
  })
})
