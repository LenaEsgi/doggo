import vine from '@vinejs/vine'

export const manageUserDogsParamsValidator = vine.create(
  vine.object({
    id: vine.string().uuid(),
  })
)

export const manageUserDogsBodyValidator = vine.create(
  vine.object({
    serialNumber: vine.string().trim(),
    key: vine.string().trim(),
  })
)

export const manageUserDogsBodyValidatorForAbandon = vine.create(
  vine.object({
    robotDogId: vine.string().uuid(),
  })
)
