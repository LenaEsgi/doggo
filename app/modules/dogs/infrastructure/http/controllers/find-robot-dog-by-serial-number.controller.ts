import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { FindRobotDogBySerialNumberUseCase } from '#dogs/application/usecases/find-robot-dog-by-serial-number.use-case'

/**
 * Résout un numéro de série (stable, défini dans les seeders) vers l'id
 * actuel du robot (peut changer d'un reseed à l'autre). Pensé pour être
 * appelé par le robot/simulateur au démarrage — pas de session utilisateur
 * à ce stade, donc pas de middleware firebaseAuth ; ne renvoie que l'id,
 * jamais la clé.
 */
@inject()
export default class FindRobotDogBySerialNumberController {
  constructor(private findRobotDogBySerialNumber: FindRobotDogBySerialNumberUseCase) {}

  public async handle({ params, response, logger }: HttpContext) {
    logger.info(
      { serialNumber: params.serialNumber },
      'FindRobotDogBySerialNumberController called'
    )

    const dog = await this.findRobotDogBySerialNumber.execute(params.serialNumber)

    response.status(200)
    return { data: { id: dog.id.value } }
  }
}
