import { test } from '@japa/runner'
import { robotTelemetryValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-telemetry.validator'
import { robotMissionUpdateValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-mission-update.validator'
import { robotStateValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-state.validator'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

test.group('MQTT payload validators', () => {
  test('accepts a valid telemetry payload', async ({ assert }) => {
    const out = await robotTelemetryValidator.validate({ battery: 80 })
    assert.equal(out.battery, 80)
  })

  test('accepts a valid telemetry payload with state', async ({ assert }) => {
    const out = await robotTelemetryValidator.validate({
      battery: 42,
      state: RobotDogState.IN_MISSION,
    })
    assert.equal(out.battery, 42)
    assert.equal(out.state, RobotDogState.IN_MISSION)
  })

  test('rejects telemetry with non-numeric battery', async ({ assert }) => {
    await assert.rejects(() => robotTelemetryValidator.validate({ battery: 'full' }))
  })

  test('rejects telemetry with battery out of range', async ({ assert }) => {
    await assert.rejects(() => robotTelemetryValidator.validate({ battery: 150 }))
  })

  test('accepts a valid mission update payload', async ({ assert }) => {
    const out = await robotMissionUpdateValidator.validate({
      missionId: '550e8400-e29b-41d4-a716-446655440000',
      stepId: '550e8400-e29b-41d4-a716-446655440001',
      status: MissionStepStatus.COMPLETED,
    })
    assert.equal(out.missionId, '550e8400-e29b-41d4-a716-446655440000')
    assert.equal(out.stepId, '550e8400-e29b-41d4-a716-446655440001')
    assert.equal(out.status, MissionStepStatus.COMPLETED)
  })

  test('rejects mission update with missing stepId', async ({ assert }) => {
    await assert.rejects(() =>
      robotMissionUpdateValidator.validate({
        missionId: '550e8400-e29b-41d4-a716-446655440000',
        status: MissionStepStatus.COMPLETED,
      })
    )
  })

  test('rejects mission update with invalid status enum value', async ({ assert }) => {
    await assert.rejects(() =>
      robotMissionUpdateValidator.validate({
        missionId: '550e8400-e29b-41d4-a716-446655440000',
        stepId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'NOT_A_STATUS',
      })
    )
  })

  test('accepts a valid state payload', async ({ assert }) => {
    const out = await robotStateValidator.validate({ state: RobotDogState.CHARGING })
    assert.equal(out.state, RobotDogState.CHARGING)
  })

  test('rejects state payload with invalid enum value', async ({ assert }) => {
    await assert.rejects(() => robotStateValidator.validate({ state: 'NOT_A_STATE' }))
  })
})
