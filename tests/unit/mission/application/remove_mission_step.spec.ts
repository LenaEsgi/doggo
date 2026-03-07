import { test } from '@japa/runner'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake_mission_repository'
import RemoveMissionStepImplementation from '#app/modules/missions/application/usecases/remove-mission-step.use-case.implementation'

test.group('RemoveMissionStepUseCase', () => {
  test('should remove a step and reorder remaining steps', async ({ assert }) => {
    // --- ARRANGE ---
    const repo = new FakeMissionRepository()
    const useCase = new RemoveMissionStepImplementation(repo)

    // 1. Create a mission with 3 steps
    const mission = Mission.create('Cleaning Mission', 'user-123')
    mission.addStep('move_to', '{"x": 1}') // Order 1
    mission.addStep('sweep', '{}') // Order 2
    mission.addStep('mop', '{}') // Order 3

    await repo.save(mission)

    // We want to remove the middle step (sweep - Order 2)
    const stepIdToRemove = mission.missionSteps[1].id.value
    const dto = {
      missionId: mission.id.value,
      stepId: stepIdToRemove,
    }

    // --- ACT ---
    await useCase.execute(dto)

    // --- ASSERT ---
    const updatedMission = await repo.findById(mission.id)
    assert.isNotNull(updatedMission)

    // Check that we only have 2 steps left
    assert.lengthOf(updatedMission!.missionSteps, 2)

    // Verify the reordering: the old Order 3 (mop) should now be Order 2
    const steps = updatedMission!.getStepsInOrder()
    assert.equal(steps[0].actionId, 'move_to')
    assert.equal(steps[0].order, 1)

    assert.equal(steps[1].actionId, 'mop')
    assert.equal(steps[1].order, 2) // Reordered!
  })

  test('should throw MissionNotFoundError when mission is not found', async ({ assert }) => {
    // --- ARRANGE ---
    const repo = new FakeMissionRepository()
    const useCase = new RemoveMissionStepImplementation(repo)
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    const dto = {
      missionId: validUuid,
      stepId: validUuid,
    }

    // --- ACT & ASSERT ---
    await assert.rejects(async () => {
      await useCase.execute(dto)
    }, MissionNotFoundError)
  })
})
