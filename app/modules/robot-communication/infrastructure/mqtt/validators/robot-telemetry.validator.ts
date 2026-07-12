import vine from '@vinejs/vine'

// Le use-case de télémétrie ne consomme que `battery` (l'état du robot arrive via
// le topic `robot/{id}/state`). On ne valide donc PAS `state` ici : un champ `state`
// inconnu ne doit pas faire rejeter toute la télémétrie (batterie/heartbeat perdus).
export const robotTelemetryValidator = vine.compile(
  vine.object({
    battery: vine.number().min(0).max(100),
  })
)
