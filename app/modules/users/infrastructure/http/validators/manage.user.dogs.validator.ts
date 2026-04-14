import vine from '@vinejs/vine'

export const manageUserDogsParamsValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)

export const manageUserDogsBodyValidator = vine.compile(
  vine.object({
    serialNumber: vine.string().trim(),
  })
)

export const manageUserDogsBodyValidatorForAbandon = vine.compile(
  vine.object({
    robotDogId: vine.string().uuid(),
  })
)
