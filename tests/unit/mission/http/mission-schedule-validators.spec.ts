import { test } from '@japa/runner'
import { CreateMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/create-mission-schedule.validator'
import { ToggleMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/toggle-mission-schedule.validator'

test.group('CreateMissionScheduleValidator', () => {
  test('accepts a valid payload', async ({ assert }) => {
    const payload = await CreateMissionScheduleValidator.validate({
      robotDogId: '8570f711-2895-4632-9599-281083096058',
      daysOfWeek: [2, 4],
      hour: 16,
      minute: 30,
    })

    assert.deepEqual(payload.daysOfWeek, [2, 4])
  })

  test('rejects an empty days of week list', async ({ assert }) => {
    await assert.rejects(() =>
      CreateMissionScheduleValidator.validate({
        robotDogId: '8570f711-2895-4632-9599-281083096058',
        daysOfWeek: [],
        hour: 16,
        minute: 30,
      })
    )
  })

  test('rejects an out-of-range hour', async ({ assert }) => {
    await assert.rejects(() =>
      CreateMissionScheduleValidator.validate({
        robotDogId: '8570f711-2895-4632-9599-281083096058',
        daysOfWeek: [2],
        hour: 24,
        minute: 0,
      })
    )
  })
})

test.group('ToggleMissionScheduleValidator', () => {
  test('accepts a boolean enabled flag', async ({ assert }) => {
    const payload = await ToggleMissionScheduleValidator.validate({ enabled: false })
    assert.isFalse(payload.enabled)
  })
})
