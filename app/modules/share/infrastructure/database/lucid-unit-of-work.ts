import db from '@adonisjs/lucid/services/db'
import { UnitOfWork, type Tx } from '#app/modules/share/domain/contracts/unit-of-work'

export class LucidUnitOfWork extends UnitOfWork {
  run<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return db.transaction((trx) => work(trx as unknown as Tx))
  }
}
