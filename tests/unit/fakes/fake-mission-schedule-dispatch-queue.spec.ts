// tests/unit/fakes/fake-mission-schedule-dispatch-queue.spec.ts
import { test } from '@japa/runner'
import { FakeMissionScheduleDispatchQueue } from '#tests/unit/fakes/fake-mission-schedule-dispatch-queue'

test.group('FakeMissionScheduleDispatchQueue', () => {
  test('records every enqueued payload in order', async ({ assert }) => {
    const queue = new FakeMissionScheduleDispatchQueue()

    await queue.enqueue({
      scheduleId: 'schedule-1',
      missionId: 'mission-1',
      dogId: 'dog-1',
      firedForMinute: '2024-01-04T12:45:00.000Z',
    })
    await queue.enqueue({
      scheduleId: 'schedule-2',
      missionId: 'mission-2',
      dogId: 'dog-2',
      firedForMinute: '2024-01-04T12:46:00.000Z',
    })

    assert.lengthOf(queue.enqueued, 2)
    assert.equal(queue.enqueued[0].scheduleId, 'schedule-1')
    assert.equal(queue.enqueued[1].scheduleId, 'schedule-2')
  })
})
