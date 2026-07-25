/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string(),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  FIREBASE_API_KEY: Env.schema.string(),
  FIREBASE_SERVICE_ACCOUNT_KEYS: Env.schema.string.optional(),
  SEED_ARTHUR_FIREBASE_UID: Env.schema.string.optional(),

  GCS_BUCKET_NAME: Env.schema.string.optional(),
  GCS_SERVICE_ACCOUNT_KEY: Env.schema.string.optional(),

  RESEND_API_KEY: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring frontend URLs
  |----------------------------------------------------------
  */
  FRONTEND_URL: Env.schema.string({ format: 'url', tld: false }),

  /*
  |----------------------------------------------------------
  | Variables for configuring MQTT broker connection
  |----------------------------------------------------------
  */
  MQTT_HOST: Env.schema.string(),
  MQTT_PORT: Env.schema.number(),
  MQTT_USERNAME: Env.schema.string.optional(),
  MQTT_PASSWORD: Env.schema.string.optional(),
  MQTT_USE_TLS: Env.schema.boolean.optional(),
  MQTT_CA_PATH: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Redis (BullMQ queue)
  |----------------------------------------------------------
  */
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring RabbitMQ (mission report queue)
  |----------------------------------------------------------
  | Optional: no RabbitMQ broker is provisioned yet in some environments
  | (e.g. the current Cloud Run production deployment). When absent, the
  | mission-report PDF subsystem is disabled at boot instead of crashing
  | (see MissionProvider.ready()).
  */
  RABBITMQ_HOST: Env.schema.string.optional({ format: 'host' }),
  RABBITMQ_PORT: Env.schema.number.optional(),
  RABBITMQ_USERNAME: Env.schema.string.optional(),
  RABBITMQ_PASSWORD: Env.schema.string.optional(),
  RABBITMQ_VHOST: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring robot liveness thresholds
  |----------------------------------------------------------
  */
  ROBOT_OFFLINE_THRESHOLD_MS: Env.schema.number.optional(),
  ROBOT_RUN_STALE_GRACE_MS: Env.schema.number.optional(),
  MISSION_RUN_MAX_DURATION_MS: Env.schema.number.optional(),
})
