import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogKey } from '#dogs/domain/value-objects/robot-dog-key'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'

function makeDog(state: RobotDogState, lastHeartbeat: Date): RobotDog {
  return RobotDog.rehydrate(
    RobotDogId.generate().value,
    `SN-${RobotDogId.generate().value}`,
    RobotDogKey.generate().value,
    'Rex',
    state,
    80,
    lastHeartbeat
  )
}

test.group('FakeRobotDogRepository', () => {
  test('findStale returns only non-OFFLINE dogs with lastHeartbeat older than the threshold', async ({
    assert,
  }) => {
    const repo = new FakeRobotDogRepository()
    const now = new Date()
    const threshold = new Date(now.getTime() - 30_000)

    const staleIdle = makeDog(RobotDogState.IDLE, new Date(threshold.getTime() - 1_000))
    const freshIdle = makeDog(RobotDogState.IDLE, new Date(threshold.getTime() + 1_000))
    const staleOffline = makeDog(RobotDogState.OFFLINE, new Date(threshold.getTime() - 1_000))
    repo.storedDogs.push(staleIdle, freshIdle, staleOffline)

    const result = await repo.findStale(threshold)

    assert.lengthOf(result, 1)
    assert.isTrue(result[0].id.equals(staleIdle.id))
  })

  test('findStale returns an empty array when no dog is stale', async ({ assert }) => {
    const repo = new FakeRobotDogRepository()
    const now = new Date()
    const threshold = new Date(now.getTime() - 30_000)

    repo.storedDogs.push(makeDog(RobotDogState.IDLE, now))

    const result = await repo.findStale(threshold)

    assert.lengthOf(result, 0)
  })
})
