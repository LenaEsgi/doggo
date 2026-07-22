import logger from '@adonisjs/core/services/logger'
import { DomainError } from '#app/modules/share/exceptions/domain-error'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'

/**
 * Filet de sécurité quand le socket opérateur d'un chien meurt (onglet fermé, reload,
 * perte réseau) : sans ça le robot ne reçoit jamais end_session et reste IN_SESSION en DB.
 * roomIsEmpty doit refléter l'état de la room APRÈS le départ de ce socket (dernier
 * opérateur du dog) pour ne pas couper une session encore suivie par un autre onglet.
 */
export async function endSessionOnOperatorDisconnect(
  dogId: string,
  roomIsEmpty: boolean,
  endSession: EndSessionCommandUseCase
): Promise<void> {
  if (!roomIsEmpty) return

  try {
    await endSession.execute(dogId)
  } catch (error) {
    if (error instanceof DomainError) return

    logger.error(
      { err: error, dogId },
      'endSessionOnOperatorDisconnect: failed to end session on disconnect'
    )
  }
}
