import { UnitOfWork, type Tx } from '#app/modules/share/domain/contracts/unit-of-work'

export class FakeUnitOfWork extends UnitOfWork {
  async run<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return work({} as Tx)
  }
}
