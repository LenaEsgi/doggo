import vine from '@vinejs/vine'

export const robotPositionValidator = vine.compile(
  vine.object({
    x: vine.number(),
    y: vine.number(),
    heading: vine.number(),
  })
)
