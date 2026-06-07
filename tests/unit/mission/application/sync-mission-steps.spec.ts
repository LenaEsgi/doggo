import { test } from '@japa/runner'
import { SyncMissionStepsUseCase } from '#app/modules/missions/application/usecases/sync-mission-steps.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'

test.group('SyncMissionStepsUseCase', () => {
  test('synce les steps et sauvegarde la mission', async ({ assert }) => {
    // --- ARRANGE ---
    const repo = new FakeMissionRepository()
    const useCase = new SyncMissionStepsUseCase(repo)

    const mission = Mission.create('Mission Test', 'user-001')
    mission.addStep('action-existing-1', 'params-1')
    mission.addStep('action-existing-2', 'params-2')
    await repo.save(mission)

    const [step1, step2] = mission.missionSteps

    // --- ACT ---
    const result = await useCase.execute({
      missionId: mission.id.value,
      steps: [
        { id: step2.id.value, actionId: step2.actionId, parameters: step2.parameters },
        { id: step1.id.value, actionId: step1.actionId, parameters: step1.parameters },
        { actionId: 'action-new', parameters: 'params-new' },
      ],
    })

    // --- ASSERT ---
    const saved = await repo.findById(mission.id)
    assert.isNotNull(saved)
    assert.lengthOf(saved!.missionSteps, 3)

    const ordered = saved!.getStepsInOrder()
    assert.equal(ordered[0].id.value, step2.id.value)
    assert.equal(ordered[0].order, 1)
    assert.equal(ordered[1].id.value, step1.id.value)
    assert.equal(ordered[1].order, 2)
    assert.equal(ordered[2].actionId, 'action-new')
    assert.equal(ordered[2].order, 3)

    // Le use case retourne la mission mise à jour
    assert.equal(result.id.value, mission.id.value)
  })

  test("lance MissionNotFoundError si la mission n'existe pas", async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const useCase = new SyncMissionStepsUseCase(repo)

    const unknownId = '550e8400-e29b-41d4-a716-446655440000'

    await assert.rejects(
      async () => useCase.execute({ missionId: unknownId, steps: [] }),
      MissionNotFoundError
    )
  })
})
