import { test } from '@japa/runner'
import DogRevokedListener from '#app/modules/notifications/application/listeners/dog-revoked.listener'
import type DogRevokedMail from '#app/modules/notifications/infrastructure/mail/dog-revoked.mail'
import OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import type { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import type { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const DOG_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6'

const user = User.rehydrate(
  USER_ID,
  'firebase-u1',
  'john@example.com',
  'John',
  'Doe',
  UserRole.USER
)
const dog = RobotDog.rehydrate(
  DOG_ID,
  'SN-001',
  'ABCDEFGHIJKLMNOPQR',
  'Rex',
  RobotDogState.IDLE,
  80,
  new Date()
)

class FakeUserGateway implements UserOwnershipGateway {
  async existsById(_id: string) {
    return true
  }
  async findByIds(_ids: string[]) {
    return [user]
  }
}

class FakeRobotDogGateway implements RobotDogOwnershipGateway {
  async existsById(_id: string) {
    return true
  }
  async findBySerialNumber(_sn: string) {
    return null
  }
  async findByIds(_ids: string[]) {
    return [dog]
  }
}

class SpyDogRevokedListener extends DogRevokedListener {
  readonly sentMails: DogRevokedMail[] = []

  protected async doSendMail(mailInstance: DogRevokedMail): Promise<void> {
    this.sentMails.push(mailInstance)
  }
}

class ThrowingDogRevokedListener extends DogRevokedListener {
  protected async doSendMail(_mailInstance: DogRevokedMail): Promise<void> {
    throw new Error('ne doit pas être appelé')
  }
}

test.group('DogRevokedListener', () => {
  test('envoie un mail quand user et dog sont trouvés', async ({ assert }) => {
    const listener = new SpyDogRevokedListener(new FakeUserGateway(), new FakeRobotDogGateway())

    await listener.handle(new OwnershipRevokedEvent(USER_ID, DOG_ID))

    assert.lengthOf(listener.sentMails, 1)
    assert.equal(listener.sentMails[0].user.email, 'john@example.com')
    assert.equal(listener.sentMails[0].robotDog.name, 'Rex')
  })

  test('ne plante pas si user introuvable', async ({ assert }) => {
    class EmptyUserGateway implements UserOwnershipGateway {
      async existsById(_id: string) {
        return false
      }
      async findByIds(_ids: string[]) {
        return []
      }
    }

    const listener = new ThrowingDogRevokedListener(
      new EmptyUserGateway(),
      new FakeRobotDogGateway()
    )

    await assert.doesNotReject(() => listener.handle(new OwnershipRevokedEvent(USER_ID, DOG_ID)))
  })
})
