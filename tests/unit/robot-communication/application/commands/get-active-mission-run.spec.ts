import { test } from '@japa/runner'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { GetActiveMissionRunUseCase } from '#app/modules/robot-communication/application/use-cases/commands/get-active-mission-run.use-case'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('GetActiveMissionRunUseCase', (group) => {
  let runRepo: FakeMissionRunRepository
  let useCase: GetActiveMissionRunUseCase

  group.each.setup(() => {
    runRepo = new FakeMissionRunRepository()
    useCase = new GetActiveMissionRunUseCase(runRepo)
  })

  test('retourne le run actif du robot', async ({ assert }) => {
    const dogId = RobotDogId.generate()
    const run = MissionRun.start(MissionId.generate(), dogId, [MissionStepId.generate()])
    await runRepo.save(run)

    const result = await useCase.execute(dogId.value)

    assert.isNotNull(result)
    assert.equal(result!.id.value, run.id.value)
  })

  test('retourne null si aucun run actif', async ({ assert }) => {
    const dogId = RobotDogId.generate()

    const result = await useCase.execute(dogId.value)

    assert.isNull(result)
  })
})
