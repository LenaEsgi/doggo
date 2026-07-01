/**
 * Robot simulator — publishes MQTT messages to test the backend without hardware.
 *
 * Usage:
 *   npx tsx scripts/robot-simulator.ts <dogId> [missionId] [stepId1,stepId2,...]
 *
 * Example (UUIDs réels de la DB) :
 *   npx tsx scripts/robot-simulator.ts abc-123 def-456 uuid-step-1,uuid-step-2,uuid-step-3
 *
 * Sans step IDs, le simulateur utilise des noms fictifs ('step-1', etc.)
 * qui ne matchent pas la base — réservé aux tests de tuyauterie MQTT uniquement.
 */

import mqtt from 'mqtt'

const DOG_ID = process.argv[2]
const MISSION_ID = process.argv[3]
const STEP_IDS_RAW = process.argv[4]

if (!DOG_ID) {
  console.error('Usage: npx tsx scripts/robot-simulator.ts <dogId> [missionId] [stepId1,stepId2,...]')
  process.exit(1)
}

const BROKER = process.env.MQTT_URL ?? 'mqtt://localhost:1883'

const client = await mqtt.connectAsync(BROKER, {
  clientId: `robot-simulator-${DOG_ID}`,
  will: {
    topic: `robot/${DOG_ID}/connected`,
    payload: 'offline',
    qos: 1,
    retain: true,
  },
})

console.log(`[simulator] Connected to ${BROKER} as dog ${DOG_ID}`)

await client.publishAsync(`robot/${DOG_ID}/connected`, 'online', { qos: 1, retain: true })

let battery = 100
let stepIndex = 0
let missionInterval: ReturnType<typeof setInterval> | undefined

const telemetryInterval = setInterval(async () => {
  battery = Math.max(0, battery - 1)

  await client.publishAsync(
    `robot/${DOG_ID}/telemetry`,
    JSON.stringify({ battery }),
    { qos: 0 }
  )

  console.log(`[simulator] telemetry → battery: ${battery}%`)

  if (battery === 0) {
    clearInterval(telemetryInterval)
    await client.endAsync()
    console.log('[simulator] Battery depleted, disconnecting.')
  }
}, 3000)

if (MISSION_ID) {
  const steps = STEP_IDS_RAW
    ? STEP_IDS_RAW.split(',').map((s) => s.trim())
    : ['step-1', 'step-2', 'step-3']

  missionInterval = setInterval(async () => {
    if (stepIndex >= steps.length) {
      clearInterval(missionInterval)
      return
    }

    const stepId = steps[stepIndex]

    await client.publishAsync(
      `robot/${DOG_ID}/mission/step`,
      JSON.stringify({
        missionId: MISSION_ID,
        stepId,
        status: 'COMPLETED',
      }),
      { qos: 1 }
    )

    console.log(`[simulator] mission step ${stepId} → COMPLETED`)
    stepIndex++
  }, 5000)
}

process.on('SIGINT', async () => {
  console.log('\n[simulator] Shutting down...')
  if (missionInterval) clearInterval(missionInterval)
  clearInterval(telemetryInterval)
  await client.publishAsync(`robot/${DOG_ID}/connected`, 'offline', { qos: 1, retain: true })
  await client.endAsync()
  process.exit(0)
})
