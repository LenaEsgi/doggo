import { test } from '@japa/runner'
import { CheckMissionRobotsFirmwareCompatibilityUseCase } from '#app/modules/missions/application/usecases/check-mission-robots-firmware-compatibility.use-case'
import { MissionFirmwareCompatibilityService } from '#app/modules/missions/application/services/mission-firmware-compatibility.service'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import { FakeRobotDogGateway } from '#tests/unit/fakes/fake-robot-dog-gateway'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import Action from '#app/modules/actions/domain/action.entity'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'

test.group('CheckMissionRobotsFirmwareCompatibilityUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let scheduleRepo: FakeMissionScheduleRepository
  let dogGateway: FakeRobotDogGateway
  let actionRepo: FakeActionRepository
  let useCase: CheckMissionRobotsFirmwareCompatibilityUseCase

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    scheduleRepo = new FakeMissionScheduleRepository()
    dogGateway = new FakeRobotDogGateway()
    actionRepo = new FakeActionRepository()
    useCase = new CheckMissionRobotsFirmwareCompatibilityUseCase(
      missionRepo,
      scheduleRepo,
      dogGateway,
      new MissionFirmwareCompatibilityService(actionRepo)
    )
  })

  test('retourne un tableau vide quand tous les robots assignés sont compatibles', async ({
    assert,
  }) => {
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '1.0.0')
    await actionRepo.save(bark)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(bark.id.value, '{}', false)
    await missionRepo.save(mission)

    const dogId = RobotDogId.generate().value
    await missionRepo.assignToDog(mission.id.value, dogId)
    dogGateway.addRobot(dogId, 'Rex', '2.0.0')

    const warnings = await useCase.execute(mission.id.value)

    assert.lengthOf(warnings, 0)
  })

  test('signale un robot devenu incompatible sans bloquer, et désactive ses schedules activés', async ({
    assert,
  }) => {
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    await actionRepo.save(bark)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(bark.id.value, '{}', false)
    await missionRepo.save(mission)

    const dogId = RobotDogId.generate()
    await missionRepo.assignToDog(mission.id.value, dogId.value)
    dogGateway.addRobot(dogId.value, 'Rex', '1.0.0')

    const enabledSchedule = MissionSchedule.create(
      MissionId.fromString(mission.id.value),
      dogId,
      [4],
      12,
      45
    )
    await scheduleRepo.save(enabledSchedule)
    const alreadyDisabledSchedule = MissionSchedule.create(
      MissionId.fromString(mission.id.value),
      dogId,
      [2],
      8,
      0
    )
    alreadyDisabledSchedule.disable()
    await scheduleRepo.save(alreadyDisabledSchedule)

    const warnings = await useCase.execute(mission.id.value)

    assert.lengthOf(warnings, 1)
    assert.equal(warnings[0].robotDogId, dogId.value)
    assert.equal(warnings[0].robotDogName, 'Rex')
    assert.equal(warnings[0].robotFirmwareVersion, '1.0.0')
    assert.deepEqual(warnings[0].incompatibleActions, [
      { code: 'BARK', name: 'Aboyer', minFirmwareVersion: '2.0.0' },
    ])
    assert.equal(warnings[0].schedulesDisabled, 1)

    const updatedEnabled = await scheduleRepo.findById(enabledSchedule.id)
    assert.isFalse(updatedEnabled?.enabled)
    const updatedAlreadyDisabled = await scheduleRepo.findById(alreadyDisabledSchedule.id)
    assert.isFalse(updatedAlreadyDisabled?.enabled)
  })

  test("ne remonte qu'un avertissement pour le robot réellement incompatible parmi plusieurs assignés", async ({
    assert,
  }) => {
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    await actionRepo.save(bark)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(bark.id.value, '{}', false)
    await missionRepo.save(mission)

    const compatibleDogId = RobotDogId.generate().value
    const incompatibleDogId = RobotDogId.generate().value
    await missionRepo.assignToDog(mission.id.value, compatibleDogId)
    await missionRepo.assignToDog(mission.id.value, incompatibleDogId)
    dogGateway.addRobot(compatibleDogId, 'Compatible', '2.0.0')
    dogGateway.addRobot(incompatibleDogId, 'Incompatible', '1.0.0')

    const warnings = await useCase.execute(mission.id.value)

    assert.lengthOf(warnings, 1)
    assert.equal(warnings[0].robotDogId, incompatibleDogId)
  })

  test("lance MissionNotFoundError si la mission n'existe pas", async ({ assert }) => {
    await assert.rejects(
      () => useCase.execute('550e8400-e29b-41d4-a716-446655440000'),
      MissionNotFoundError
    )
  })
})
