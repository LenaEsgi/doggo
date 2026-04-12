import UserModel from '#users/infrastructure/database/models/user'
import Factory from '@adonisjs/lucid/factories'
import { UserRole } from '#users/domain/enums/user.role'

export const UserFactory = Factory.define(UserModel, ({ faker }) => {
  const firstname = faker.person.firstName()
  const lastname = faker.person.lastName()
  const uniqueSuffix = faker.string.alphanumeric(8).toLowerCase()

  return {
    id: faker.string.uuid(),
    firebaseUid: `firebase-${faker.string.uuid()}`,
    firstname,
    lastname,
    email: `${firstname}.${lastname}.${uniqueSuffix}@example.com`.toLowerCase(),
    role: faker.helpers.arrayElement([UserRole.USER, UserRole.ADMIN]),
  }
}).build()
