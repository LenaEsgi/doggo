// tests/unit/missions/create_mission_use_case.spec.ts
import { test } from '@japa/runner'
import { CreateMissionUseCaseImplementation } from '#app/modules/missions/application/usecases/create-mission.use-case.implementation'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake_mission_repository'
import { FakeRobotDogGateway } from '#tests/unit/fakes/fake_robot_dog_gateway'
import { FakeUserGateway } from '#tests/unit/fakes/fake_user_gateway'

test.group('CreateMissionUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let robotGateway: FakeRobotDogGateway
  let userGateway: FakeUserGateway
  let useCase: CreateMissionUseCaseImplementation

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    robotGateway = new FakeRobotDogGateway()
    userGateway = new FakeUserGateway()

    useCase = new CreateMissionUseCaseImplementation(missionRepo, robotGateway, userGateway)
  })

  test('should create and save a mission when robot and user exist', async ({ assert }) => {
    // Arrange
    const robotId = '8570f711-2895-4632-9599-281083096058'
    const userId = 'user-123'
    const missionName = 'Inspect Sector A'

    robotGateway.addRobot(robotId)
    userGateway.addUser(userId)

    // Act
    await useCase.execute({
      name: missionName,
      robotDogId: robotId,
      userId: userId,
    })

    // Assert
    assert.lengthOf(missionRepo.storedMissions, 1)
    assert.equal(missionRepo.storedMissions[0].name, missionName)
    assert.equal(missionRepo.storedMissions[0].userId, userId)
  })

  test('should throw RobotDogNotFoundError if robot does not exist', async ({ assert }) => {
    // Arrange
    const robotId = '8570f711-2895-4632-9599-281083096058'
    userGateway.addUser('user-123') // L'utilisateur existe mais pas le robot

    // Act & Assert
    await assert.rejects(
      () =>
        useCase.execute({
          name: 'Fail Mission',
          robotDogId: robotId,
          userId: 'user-123',
        }),
      RobotDogNotFoundError
    )

    assert.lengthOf(missionRepo.storedMissions, 0)
  })

  test('should throw InvalidUserNotFoundError if user does not exist', async ({ assert }) => {
    // Arrange
    const robotId = '8570f711-2895-4632-9599-281083096058'
    const userId = 'unknown-user'

    robotGateway.addRobot(robotId)

    // Act & Assert
    await assert.rejects(
      () =>
        useCase.execute({
          name: 'Fail Mission',
          robotDogId: robotId,
          userId: userId,
        }),
      InvalidUserNotFoundError
    )

    assert.lengthOf(missionRepo.storedMissions, 0)
  })
})
