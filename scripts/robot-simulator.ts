/**
 * Robot simulator — publishes MQTT messages to test the backend without hardware.
 *
 * Usage:
 *   ROBOT_MQTT_PASSWORD=<motdepasse> npx tsx scripts/robot-simulator.ts <dogId> [missionId] [stepId1,stepId2,...]
 *
 * Example (UUIDs réels de la DB) :
 *   ROBOT_MQTT_PASSWORD=xxx npx tsx scripts/robot-simulator.ts abc-123 def-456 uuid-step-1,uuid-step-2,uuid-step-3
 *
 * Sans step IDs, le simulateur utilise des noms fictifs ('step-1', etc.)
 * qui ne matchent pas la base — réservé aux tests de tuyauterie MQTT uniquement.
 *
 * Le broker (allow_anonymous false) exige un compte MQTT par robot dont le username
 * est l'id du robot (voir mosquitto/aclfile — pattern readwrite robot/%u/#) :
 *   docker run --rm -v "$PWD/mosquitto:/m" eclipse-mosquitto:2 \
 *     mosquitto_passwd -b /m/passwordfile <dogId> <motdepasse>
 *   puis `docker restart robot_dog_mqtt` pour recharger le passwordfile.
 *
 * Le simulateur réagit aussi à robot/{dogId}/command pour le pilotage temps réel
 * ("Control this dog") : start_session ouvre une boucle de position simulée
 * publiée sur robot/{dogId}/position, drive change la direction courante,
 * end_session l'arrête.
 */

import mqtt from 'mqtt'

const DOG_ID = process.argv[2]
const MISSION_ID = process.argv[3]
const STEP_IDS_RAW = process.argv[4]

if (!DOG_ID) {
  console.error(
    'Usage: npx tsx scripts/robot-simulator.ts <dogId> [missionId] [stepId1,stepId2,...]'
  )
  process.exit(1)
}

const BROKER = process.env.MQTT_URL ?? 'mqtt://localhost:1883'
const MQTT_PASSWORD = process.env.ROBOT_MQTT_PASSWORD

if (!MQTT_PASSWORD) {
  console.error(
    'Missing ROBOT_MQTT_PASSWORD. The broker requires a per-robot MQTT account ' +
      '(username = dogId) — see the usage comment at the top of this file.'
  )
  process.exit(1)
}

const client = await mqtt.connectAsync(BROKER, {
  clientId: `robot-simulator-${DOG_ID}`,
  username: DOG_ID,
  password: MQTT_PASSWORD,
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

// --- Pilotage temps réel ("Control this dog") ---
// Deux axes indépendants façon voiture : impossible de pivoter (steering) sans
// avancer/reculer (throttle) en même temps — comme dans la vraie vie, tourner
// le volant à l'arrêt ne fait pas tourner la voiture.
type Throttle = 'forward' | 'backward' | 'none'
type Steering = 'left' | 'right' | 'none'

const MOVE_STEP = 4 // unités par tick en avant/arrière
const TURN_STEP = 6 // degrés par tick en rotation, appliqué seulement si throttle actif
const DRIVE_TICK_MS = 150

let position = { x: 0, y: 0, heading: 0 }
let currentThrottle: Throttle = 'none'
let currentSteering: Steering = 'none'
let driveInterval: ReturnType<typeof setInterval> | undefined

function driveTick() {
  if (currentThrottle === 'none') return // à l'arrêt : le steering seul n'a aucun effet

  if (currentSteering === 'left') {
    position = { ...position, heading: (position.heading - TURN_STEP + 360) % 360 }
  } else if (currentSteering === 'right') {
    position = { ...position, heading: (position.heading + TURN_STEP) % 360 }
  }

  const radians = (position.heading * Math.PI) / 180
  const sign = currentThrottle === 'forward' ? 1 : -1
  position = {
    ...position,
    x: position.x + sign * MOVE_STEP * Math.sin(radians),
    y: position.y - sign * MOVE_STEP * Math.cos(radians),
  }

  client.publishAsync(`robot/${DOG_ID}/position`, JSON.stringify(position), { qos: 0 }).catch(() => {
    /* client déconnecté entre deux ticks — sans objet, le prochain clearInterval s'en charge */
  })
}

await client.subscribeAsync(`robot/${DOG_ID}/command`)

client.on('message', (topic, payload) => {
  if (topic !== `robot/${DOG_ID}/command`) return

  let command: { type?: string; throttle?: string; steering?: string }
  try {
    command = JSON.parse(payload.toString())
  } catch {
    return
  }

  if (command.type === 'start_session') {
    position = { x: 0, y: 0, heading: 0 }
    currentThrottle = 'none'
    currentSteering = 'none'
    if (!driveInterval) driveInterval = setInterval(driveTick, DRIVE_TICK_MS)
    console.log('[simulator] session started — drive loop running')
  } else if (command.type === 'drive') {
    const throttleValues: Throttle[] = ['forward', 'backward', 'none']
    const steeringValues: Steering[] = ['left', 'right', 'none']
    if (
      throttleValues.includes(command.throttle as Throttle) &&
      steeringValues.includes(command.steering as Steering)
    ) {
      // Filet de sécurité : si le simulateur s'est (re)connecté après le
      // start_session (ex. redémarrage pour recharger les identifiants MQTT),
      // la boucle de position n'a jamais démarré. Une commande drive implique
      // forcément une session active côté back — on la démarre ici aussi.
      if (!driveInterval) driveInterval = setInterval(driveTick, DRIVE_TICK_MS)
      currentThrottle = command.throttle as Throttle
      currentSteering = command.steering as Steering
      console.log(`[simulator] throttle → ${currentThrottle}, steering → ${currentSteering}`)
    }
  } else if (command.type === 'end_session') {
    if (driveInterval) {
      clearInterval(driveInterval)
      driveInterval = undefined
    }
    currentThrottle = 'none'
    currentSteering = 'none'
    console.log('[simulator] session ended — drive loop stopped')
  }
})

const telemetryInterval = setInterval(async () => {
  battery = Math.max(0, battery - 1)

  await client.publishAsync(`robot/${DOG_ID}/telemetry`, JSON.stringify({ battery }), { qos: 0 })

  console.log(`[simulator] telemetry → battery: ${battery}%`)

  if (battery === 0) {
    clearInterval(telemetryInterval)
    if (driveInterval) {
      clearInterval(driveInterval)
      driveInterval = undefined
    }
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
  if (driveInterval) clearInterval(driveInterval)
  clearInterval(telemetryInterval)
  await client.publishAsync(`robot/${DOG_ID}/connected`, 'offline', { qos: 1, retain: true })
  await client.endAsync()
  process.exit(0)
})
