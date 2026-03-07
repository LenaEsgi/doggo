import { test } from '@japa/runner'
import { MoveMissionStepUseCaseImplementation } from '#app/modules/missions/application/usecases/move-mission-step.use-case.implementation'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake_mission_repository'

test.group('MoveMissionStepUseCase', () => {

  test('should move a step and reorder other steps accordingly', async ({ assert }) => {
    // --- ARRANGE ---
    const repo = new FakeMissionRepository()
    const useCase = new MoveMissionStepUseCaseImplementation(repo)

    // 1. Create a mission with 3 steps (Initial Orders: 1, 2, 3)
    const mission = Mission.create('Night Patrol', 'user-001')
    mission.addStep('move_to', '{"x": 1}')    // Step A -> Order 1
    mission.addStep('take_photo', '{}')       // Step B -> Order 2
    mission.addStep('charge_battery', '{}')   // Step C -> Order 3

    await repo.save(mission)

    // We want to move the 3rd step (Charge) to the 1st position
    const stepIdToMove = mission.missionSteps[2].id.value
    const newOrder = 1

    const dto = {
      missionId: mission.id.value,
      stepId: stepIdToMove,
      newOrder: newOrder
    }

    // --- ACT ---
    await useCase.execute(dto)

    // --- ASSERT ---
    const updatedMission = await repo.findById(mission.id)
    assert.isNotNull(updatedMission)

    // Retrieve steps sorted by their sequence order
    const steps = updatedMission!.getStepsInOrder()

    // 1. The "charge_battery" step must now be at Order 1
    assert.equal(steps[0].id.value, stepIdToMove)
    assert.equal(steps[0].order, 1)

    // 2. The old Order 1 (move_to) must have shifted to Order 2
    assert.equal(steps[1].order, 2)
    assert.equal(steps[1].actionId, 'move_to')

    // 3. The old Order 2 (take_photo) must have shifted to Order 3
    assert.equal(steps[2].order, 3)
    assert.equal(steps[2].actionId, 'take_photo')
  })

  test('should throw MissionNotFoundError when mission does not exist', async ({ assert }) => {
    // --- ARRANGE ---
    const repo = new FakeMissionRepository()
    const useCase = new MoveMissionStepUseCaseImplementation(repo)
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    const dto = {
      missionId: validUuid,
      stepId: validUuid,
      newOrder: 1
    }

    // --- ACT & ASSERT ---
    // Using async wrapper to correctly catch the rejected promise
    await assert.rejects(async () => {
      await useCase.execute(dto)
    }, MissionNotFoundError)
  })
})
