import env from '#start/env'

const robotConfig = {
  offlineThresholdMs: env.get('ROBOT_OFFLINE_THRESHOLD_MS', 30_000),
  runStaleGraceMs: env.get('ROBOT_RUN_STALE_GRACE_MS', 90_000),
  runMaxDurationMs: env.get('MISSION_RUN_MAX_DURATION_MS', 1_800_000),
}

export default robotConfig
