import vine from '@vinejs/vine'

export const MoveMissionStepValidator = vine.create({
  newOrder: vine.number().positive(),
})
