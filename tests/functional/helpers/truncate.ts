import app from '@adonisjs/core/services/app'

/**
 * Truncates all tables between tests without going through
 * `testUtils.db().truncate()`, which re-runs `migration:run` (and its
 * Postgres advisory lock acquire/release) on every single test. Under CI's
 * higher-latency connection to the Postgres service container, that lock
 * release intermittently fails ("unable to release database lock"),
 * failing the test right after. Migrations only need to run once per
 * suite (already handled by the global setup in tests/bootstrap.ts), so
 * per-test resets only need to clear data.
 */
export async function truncateDb(): Promise<void> {
  const ace = await app.container.make('ace')
  const command = await ace.exec('db:truncate', [])
  if (command.error) {
    throw command.error
  }
}
