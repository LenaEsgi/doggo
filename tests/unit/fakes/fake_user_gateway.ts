import { UserGateway } from '#app/modules/missions/application/contracts/user.gateway'

export class FakeUserGateway implements UserGateway {
  public users: Map<string, any> = new Map()

  async findBy(id: string) {
    return this.users.get(id) || null
  }

  addUser(id: string) {
    this.users.set(id, { id, name: 'John Doe' })
  }
}
