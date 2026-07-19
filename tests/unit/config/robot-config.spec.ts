import { test } from '@japa/runner'
import robotConfig from '#config/robot'

test.group('Robot Config', () => {
  test('should export default liveness threshold values', ({ assert }) => {
    assert.equal(robotConfig.offlineThresholdMs, 30_000)
    assert.equal(robotConfig.runStaleGraceMs, 90_000)
    assert.equal(robotConfig.runMaxDurationMs, 1_800_000)
  })
})
