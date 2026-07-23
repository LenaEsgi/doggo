import { test } from '@japa/runner'
import { MissionFirmwareCompatibilityService } from '#app/modules/missions/application/services/mission-firmware-compatibility.service'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import Action from '#app/modules/actions/domain/action.entity'

test.group('MissionFirmwareCompatibilityService', () => {
  test('retourne un tableau vide si toutes les actions sont compatibles', async ({ assert }) => {
    const actionRepo = new FakeActionRepository()
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '1.0.0')
    await actionRepo.save(bark)
    const service = new MissionFirmwareCompatibilityService(actionRepo)

    const result = await service.findIncompatibleActions([bark.id.value], '2.0.0')

    assert.lengthOf(result, 0)
  })

  test('retourne les actions dont le minFirmwareVersion dépasse la version du robot', async ({
    assert,
  }) => {
    const actionRepo = new FakeActionRepository()
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    await actionRepo.save(bark)
    const service = new MissionFirmwareCompatibilityService(actionRepo)

    const result = await service.findIncompatibleActions([bark.id.value], '1.0.0')

    assert.deepEqual(result, [{ code: 'BARK', name: 'Aboyer', minFirmwareVersion: '2.0.0' }])
  })

  test('ignore les actions sans restriction (minFirmwareVersion null)', async ({ assert }) => {
    const actionRepo = new FakeActionRepository()
    const wait = Action.create('WAIT', 'Attendre', 'wait', null)
    await actionRepo.save(wait)
    const service = new MissionFirmwareCompatibilityService(actionRepo)

    const result = await service.findIncompatibleActions([wait.id.value], '1.0.0')

    assert.lengthOf(result, 0)
  })

  test('déduplique les ids d\'actions en doublon', async ({ assert }) => {
    const actionRepo = new FakeActionRepository()
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    await actionRepo.save(bark)
    const service = new MissionFirmwareCompatibilityService(actionRepo)

    const result = await service.findIncompatibleActions(
      [bark.id.value, bark.id.value],
      '1.0.0'
    )

    assert.lengthOf(result, 1)
  })

  test('ignore silencieusement une action introuvable (supprimée entre-temps)', async ({
    assert,
  }) => {
    const actionRepo = new FakeActionRepository()
    const service = new MissionFirmwareCompatibilityService(actionRepo)

    const result = await service.findIncompatibleActions(
      ['550e8400-e29b-41d4-a716-446655440099'],
      '1.0.0'
    )

    assert.lengthOf(result, 0)
  })
})
