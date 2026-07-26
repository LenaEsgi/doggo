import { test } from '@japa/runner'
import { NotificationMessageTranslator } from '#app/modules/notifications/application/notification-message.translator'

test.group('NotificationMessageTranslator', () => {
  test('traduit un message en français avec les valeurs du payload', ({ assert }) => {
    const translator = new NotificationMessageTranslator()

    const message = translator.translate(
      'dog.assigned',
      { robotDogName: 'Rex' },
      'fr'
    )

    assert.equal(message, 'Le robot Rex vous a été assigné')
  })

  test('traduit le meme message en anglais', ({ assert }) => {
    const translator = new NotificationMessageTranslator()

    const message = translator.translate(
      'dog.assigned',
      { robotDogName: 'Rex' },
      'en'
    )

    assert.equal(message, 'Robot dog Rex has been assigned to you')
  })

  test('utilise les valeurs par defaut quand le payload est absent', ({ assert }) => {
    const translator = new NotificationMessageTranslator()

    assert.equal(
      translator.translate('dog.revoked', undefined, 'fr'),
      'Vous avez été retiré du robot le robot'
    )
    assert.equal(
      translator.translate('dog.revoked', undefined, 'en'),
      'You have been removed from robot dog the robot'
    )
  })

  test('mission.interrupted mappe ROBOT_OFFLINE et MAX_DURATION en fr et en', ({ assert }) => {
    const translator = new NotificationMessageTranslator()

    assert.equal(
      translator.translate(
        'mission.interrupted',
        { missionName: 'Patrouille', robotDogName: 'Rex', reason: 'ROBOT_OFFLINE' },
        'fr'
      ),
      'Patrouille a été interrompue sur le robot Rex : robot hors ligne'
    )
    assert.equal(
      translator.translate(
        'mission.interrupted',
        { missionName: 'Patrouille', robotDogName: 'Rex', reason: 'MAX_DURATION' },
        'fr'
      ),
      'Patrouille a été interrompue sur le robot Rex : durée maximale atteinte'
    )
    assert.equal(
      translator.translate(
        'mission.interrupted',
        { missionName: 'Patrouille', robotDogName: 'Rex', reason: 'ROBOT_OFFLINE' },
        'en'
      ),
      'Patrouille was interrupted on robot dog Rex: robot offline'
    )
  })

  test('mission.start_failed mappe FIRMWARE_INCOMPATIBLE en fr et en (pas de fallback robot_busy)', ({
    assert,
  }) => {
    const translator = new NotificationMessageTranslator()

    assert.equal(
      translator.translate(
        'mission.start_failed',
        { missionName: 'Patrouille', robotDogName: 'Rex', reason: 'FIRMWARE_INCOMPATIBLE' },
        'fr'
      ),
      "Patrouille n'a pas pu démarrer sur le robot Rex : le firmware du robot n'est pas compatible avec cette mission"
    )
    assert.equal(
      translator.translate(
        'mission.start_failed',
        { missionName: 'Patrouille', robotDogName: 'Rex', reason: 'FIRMWARE_INCOMPATIBLE' },
        'en'
      ),
      "Patrouille could not start on robot dog Rex: the robot's firmware is not compatible with this mission"
    )
  })

  test('traduit chaque type de notification sans lever', ({ assert }) => {
    const translator = new NotificationMessageTranslator()
    const types = [
      'dog.assigned',
      'dog.revoked',
      'dog.member.assigned',
      'dog.member.revoked',
      'mission.started',
      'mission.completed',
      'mission.failed',
      'mission.skipped',
      'mission.interrupted',
    ] as const

    for (const type of types) {
      for (const locale of ['fr', 'en'] as const) {
        const message = translator.translate(
          type,
          { robotDogName: 'Rex', missionName: 'Patrouille', memberName: 'Jean' },
          locale
        )
        assert.isString(message)
        assert.isAbove(message.length, 0)
      }
    }
  })
})
