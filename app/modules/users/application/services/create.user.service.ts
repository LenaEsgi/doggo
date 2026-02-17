import { inject } from '@adonisjs/core'
import { randomUUID } from 'node:crypto'
import { CreateUserService } from '#users/application/contracts/create.user.service'
import { CreateUserDto } from '#users/application/dto/create.user.dto'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { User } from '#users/domain/user.entity'

@inject()
export class CreateUser implements CreateUserService {
  constructor(private repository: UserWriteRepository) {}

  create(dto: CreateUserDto): Promise<User> {
    const user = User.create(randomUUID(), dto.email, dto.firstname, dto.lastname)
    return this.repository.create(user)
  }
}
