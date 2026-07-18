/** Handle de transaction opaque côté domaine (aucun type Lucid ne fuit ici). */
export type Tx = { readonly __brand: 'Tx' }

export abstract class UnitOfWork {
  abstract run<T>(work: (tx: Tx) => Promise<T>): Promise<T>
}
