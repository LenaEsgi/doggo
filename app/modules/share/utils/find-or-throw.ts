import logger from '@adonisjs/core/services/logger'

/**
 * Exécute `find`, et lève `new ErrorCtor(id)` si le résultat est null/undefined.
 * Remplace le pattern dupliqué `const x = await repo.findById(id); if (!x) throw ...`.
 */
export async function findOrThrow<T>(
  find: () => Promise<T | null | undefined>,
  ErrorCtor: new (id: string) => Error,
  id: string
): Promise<T> {
  const result = await find()

  if (result === null || result === undefined) {
    logger.warn({ id, error: ErrorCtor.name }, 'findOrThrow: entity not found')
    throw new ErrorCtor(id)
  }

  return result
}

/**
 * Variante booléenne de findOrThrow, pour les lookups de type `existsById(id): Promise<boolean>`.
 */
export async function assertExistsOrThrow(
  exists: () => Promise<boolean>,
  ErrorCtor: new (id: string) => Error,
  id: string
): Promise<void> {
  const found = await exists()

  if (!found) {
    logger.warn({ id, error: ErrorCtor.name }, 'assertExistsOrThrow: entity not found')
    throw new ErrorCtor(id)
  }
}
