import { test } from '@japa/runner'
import DogAssignedMail from '#app/modules/notifications/infrastructure/mail/dog-assigned.mail'
import DogRevokedMail from '#app/modules/notifications/infrastructure/mail/dog-revoked.mail'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

const DOG_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6'
const USER_FR_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const USER_EN_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7'

const dog = RobotDog.rehydrate(DOG_ID, 'SN1', 'ABCDEFGHIJKLMNOPQR', 'Rex', RobotDogState.IDLE, 80, new Date())
const userFr = User.rehydrate(USER_FR_ID, 'fb1', 'a@a.com', 'Jean', 'Dupont', UserRole.USER, 'fr')
const userEn = User.rehydrate(USER_EN_ID, 'fb2', 'b@b.com', 'John', 'Doe', UserRole.USER, 'en')

test.group('Mail subject translated from user.locale', () => {
  test('DogAssignedMail: sujet en fr et en selon user.locale', ({ assert }) => {
    const mailFr = new DogAssignedMail(userFr, dog, 'http://x')
    const mailEn = new DogAssignedMail(userEn, dog, 'http://x')

    assert.equal(mailFr.subject, 'Vous avez été assigné au robot dog Rex')
    assert.equal(mailEn.subject, 'You have been assigned to robot dog Rex')
  })

  test('DogRevokedMail: sujet en fr et en selon user.locale', ({ assert }) => {
    const mailFr = new DogRevokedMail(userFr, dog)
    const mailEn = new DogRevokedMail(userEn, dog)

    assert.equal(mailFr.subject, 'Vous avez été retiré du robot dog Rex')
    assert.equal(mailEn.subject, 'You have been removed from robot dog Rex')
  })
})
