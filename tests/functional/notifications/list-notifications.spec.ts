import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { authenticateAs } from '#tests/functional/helpers/auth'
import NotificationModel from '#app/modules/notifications/infrastructure/database/models/notification.model'

test.group('GET /api/v1/notifications', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('traduit le message en francais quand la locale de l\'utilisateur est fr', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { locale: 'fr' })

    await NotificationModel.create({
      userId: auth.user.id,
      type: 'dog.assigned',
      message: 'stored-value-should-be-ignored',
      severity: 'info',
      payload: { robotDogName: 'Rex' },
      robotDogId: null,
      isRead: false,
    })

    const response = await client.get('/api/v1/notifications').header('Authorization', auth.header)
    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data[0].message, 'Le robot Rex vous a été assigné')
  })

  test('traduit le meme enregistrement en anglais quand la locale est en', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { locale: 'en' })

    await NotificationModel.create({
      userId: auth.user.id,
      type: 'dog.assigned',
      message: 'stored-value-should-be-ignored',
      severity: 'info',
      payload: { robotDogName: 'Rex' },
      robotDogId: null,
      isRead: false,
    })

    const response = await client.get('/api/v1/notifications').header('Authorization', auth.header)
    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data[0].message, 'Robot dog Rex has been assigned to you')
  })
})
