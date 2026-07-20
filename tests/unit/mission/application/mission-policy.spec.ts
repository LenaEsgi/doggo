import { test } from '@japa/runner'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import MissionPolicy from '#app/modules/missions/application/policies/mission.policy'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import Mission from '#app/modules/missions/domain/entities/mission.entity'

const DOG_ID = '8570f711-2895-4632-9599-281083096058'
const OTHER_DOG_ID = 'b1c2d3e4-f5a6-7890-abcd-ef1234567890'

function makeUser(id: string): User {
  return User.rehydrate(id, `fb-${id}`, `${id}@test.com`, 'Test', 'User', UserRole.USER)
}

test.group('MissionPolicy.removeFromDog', (group) => {
  let missionRepo: FakeMissionRepository
  let ownershipRepo: FakeOwnershipRepository
  let policy: MissionPolicy

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    ownershipRepo = new FakeOwnershipRepository()
    policy = new MissionPolicy(missionRepo, ownershipRepo)
  })

  test('owner of dog can remove a mission they do not own', async ({ assert }) => {
    const dogOwner = makeUser('owner-1')
    const missionCreator = makeUser('creator-1')

    await ownershipRepo.adopt(dogOwner.id, DOG_ID)
    const mission = Mission.create('Patrol', missionCreator.id)
    await missionRepo.save(mission)

    const result = await policy.removeFromDog(dogOwner, DOG_ID, mission.id.value)

    assert.isTrue(result)
  })

  test('owner of dog can remove a mission they also own', async ({ assert }) => {
    const user = makeUser('user-1')

    await ownershipRepo.adopt(user.id, DOG_ID)
    const mission = Mission.create('Patrol', user.id)
    await missionRepo.save(mission)

    const result = await policy.removeFromDog(user, DOG_ID, mission.id.value)

    assert.isTrue(result)
  })

  test('non-owner of dog cannot remove a mission even if they own it', async ({ assert }) => {
    const missionOwner = makeUser('creator-1')

    const mission = Mission.create('Patrol', missionOwner.id)
    await missionRepo.save(mission)
    // missionOwner is NOT owner of the dog

    const result = await policy.removeFromDog(missionOwner, DOG_ID, mission.id.value)

    assert.isFalse(result)
  })

  test('unrelated user cannot remove any mission from a dog', async ({ assert }) => {
    const dogOwner = makeUser('owner-1')
    const stranger = makeUser('stranger-1')

    await ownershipRepo.adopt(dogOwner.id, DOG_ID)
    const mission = Mission.create('Patrol', dogOwner.id)
    await missionRepo.save(mission)

    const result = await policy.removeFromDog(stranger, DOG_ID, mission.id.value)

    assert.isFalse(result)
  })

  test('owner of a different dog cannot remove from another dog', async ({ assert }) => {
    const user = makeUser('user-1')

    await ownershipRepo.adopt(user.id, OTHER_DOG_ID)
    const mission = Mission.create('Patrol', user.id)
    await missionRepo.save(mission)

    const result = await policy.removeFromDog(user, DOG_ID, mission.id.value)

    assert.isFalse(result)
  })
})

test.group('MissionPolicy.viewSchedule', (group) => {
  let missionRepo: FakeMissionRepository
  let ownershipRepo: FakeOwnershipRepository
  let policy: MissionPolicy

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    ownershipRepo = new FakeOwnershipRepository()
    policy = new MissionPolicy(missionRepo, ownershipRepo)
  })

  test('mission owner can view schedules even without owning the dog', async ({ assert }) => {
    const missionOwner = makeUser('creator-1')

    const mission = Mission.create('Patrol', missionOwner.id)
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, DOG_ID)

    const result = await policy.viewSchedule(missionOwner, mission.id.value)

    assert.isTrue(result)
  })

  test('owner of the assigned dog can view schedules without owning the mission', async ({
    assert,
  }) => {
    const dogOwner = makeUser('owner-1')
    const missionCreator = makeUser('creator-1')

    const mission = Mission.create('Patrol', missionCreator.id)
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, DOG_ID)
    await ownershipRepo.adopt(dogOwner.id, DOG_ID)

    const result = await policy.viewSchedule(dogOwner, mission.id.value)

    assert.isTrue(result)
  })

  test('owner of an unrelated dog cannot view schedules', async ({ assert }) => {
    const otherDogOwner = makeUser('owner-1')
    const missionCreator = makeUser('creator-1')

    const mission = Mission.create('Patrol', missionCreator.id)
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, DOG_ID)
    await ownershipRepo.adopt(otherDogOwner.id, OTHER_DOG_ID)

    const result = await policy.viewSchedule(otherDogOwner, mission.id.value)

    assert.isFalse(result)
  })

  test('unrelated stranger cannot view schedules', async ({ assert }) => {
    const missionCreator = makeUser('creator-1')
    const stranger = makeUser('stranger-1')

    const mission = Mission.create('Patrol', missionCreator.id)
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, DOG_ID)

    const result = await policy.viewSchedule(stranger, mission.id.value)

    assert.isFalse(result)
  })
})

test.group('MissionPolicy.createSchedule', (group) => {
  let missionRepo: FakeMissionRepository
  let ownershipRepo: FakeOwnershipRepository
  let policy: MissionPolicy

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    ownershipRepo = new FakeOwnershipRepository()
    policy = new MissionPolicy(missionRepo, ownershipRepo)
  })

  test('mission owner can schedule it on a dog they do not own', async ({ assert }) => {
    const missionOwner = makeUser('creator-1')

    const mission = Mission.create('Patrol', missionOwner.id)
    await missionRepo.save(mission)

    const result = await policy.createSchedule(missionOwner, mission.id.value, DOG_ID)

    assert.isTrue(result)
  })

  test('owner of the target dog can schedule a mission they do not own', async ({ assert }) => {
    const dogOwner = makeUser('owner-1')
    const missionCreator = makeUser('creator-1')

    const mission = Mission.create('Patrol', missionCreator.id)
    await missionRepo.save(mission)
    await ownershipRepo.adopt(dogOwner.id, DOG_ID)

    const result = await policy.createSchedule(dogOwner, mission.id.value, DOG_ID)

    assert.isTrue(result)
  })

  test('owner of a different dog cannot schedule a mission for the target dog', async ({
    assert,
  }) => {
    const otherDogOwner = makeUser('owner-1')
    const missionCreator = makeUser('creator-1')

    const mission = Mission.create('Patrol', missionCreator.id)
    await missionRepo.save(mission)
    await ownershipRepo.adopt(otherDogOwner.id, OTHER_DOG_ID)

    const result = await policy.createSchedule(otherDogOwner, mission.id.value, DOG_ID)

    assert.isFalse(result)
  })

  test('unrelated stranger cannot create a schedule', async ({ assert }) => {
    const missionCreator = makeUser('creator-1')
    const stranger = makeUser('stranger-1')

    const mission = Mission.create('Patrol', missionCreator.id)
    await missionRepo.save(mission)

    const result = await policy.createSchedule(stranger, mission.id.value, DOG_ID)

    assert.isFalse(result)
  })
})
