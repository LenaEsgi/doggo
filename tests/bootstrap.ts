import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'
import { MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'
import { FakeMqttAccountProvisioner } from '#tests/unit/fakes/fake-mqtt-account-provisioner'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import { FakeMissionTimeoutQueue } from '#tests/unit/fakes/fake-mission-timeout-queue'
import { MissionScheduleDispatchQueue } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'
import { FakeMissionScheduleDispatchQueue } from '#tests/unit/fakes/fake-mission-schedule-dispatch-queue'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [assert(), apiClient(), pluginAdonisJS(app)]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [() => testUtils.db().truncate()],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite
      .setup(() => testUtils.httpServer().start())
      .setup(() => {
        // The mqtt_provider is excluded from the "test" environment (see
        // adonisrc.ts), so MqttAccountProvisioner is never bound to a real,
        // connected broker here. Swap in a fake so functional tests exercise
        // the real HTTP/use-case flow without depending on a live MQTT broker.
        app.container.swap(MqttAccountProvisioner, () => new FakeMqttAccountProvisioner())

        // queue_provider always binds the real BullMQ-backed queues (its Redis
        // workers are gated to "web", but the queues themselves are not). Swap
        // them for in-memory fakes so functional tests never open a real Redis
        // connection — an unclosed BullMQ connection keeps the process alive
        // forever if Redis is ever unreachable (e.g. CI, or a dropped local
        // connection), since ioredis retries with no limit by default.
        app.container.swap(MissionTimeoutQueue, () => new FakeMissionTimeoutQueue())
        app.container.swap(
          MissionScheduleDispatchQueue,
          () => new FakeMissionScheduleDispatchQueue()
        )
      })
  }
}
