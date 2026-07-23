import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FindRobotDogBySerialNumberUseCase } from '#dogs/application/usecases/find-robot-dog-by-serial-number.use-case'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'

test.group('FindRobotDogBySerialNumberUseCase', (group) => {
  let dogRepository: FakeRobotDogRepository
  let useCase: FindRobotDogBySerialNumberUseCase

  group.each.setup(() => {
    dogRepository = new FakeRobotDogRepository()
    useCase = new FindRobotDogBySerialNumberUseCase(dogRepository)
  })

  test('retourne le robot dog correspondant au numéro de série', async ({ assert }) => {
    const dog = RobotDog.create('SN-SIMULATOR-NOVA', 'Nova', 100)
    dogRepository.storedDogs.push(dog)

    const found = await useCase.execute('SN-SIMULATOR-NOVA')

    assert.equal(found.id.value, dog.id.value)
  })

  test("lève RobotDogNotFoundError si aucun robot n'a ce numéro de série", async ({ assert }) => {
    await assert.rejects(() => useCase.execute('SN-DOES-NOT-EXIST'), RobotDogNotFoundError)
  })
})
