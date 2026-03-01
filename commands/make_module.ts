import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { args } from '@adonisjs/core/ace'

const STUBS_ROOT = "../stubs"

export default class MakeModule extends BaseCommand {
  static commandName = 'make:module'
  static description = 'Generate a clean architecture module'

  static options: CommandOptions = {}

  @args.string({ description: 'Module name' })
  declare name: string


  async run() {
    const codemods = await this.createCodemods()

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/domain/entity.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/domain/contracts/repository.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/create.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/update.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/show.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/destroy.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/output.stub', { name: this.name })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/contracts/create.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/contracts/show.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/contracts/index.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/contracts/update.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/contracts/destroy.stub', { name: this.name })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/create.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/show.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/index.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/update.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/destroy.stub', { name: this.name })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/http/controllers/create.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/http/controllers/show.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/http/controllers/index.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/http/controllers/update.stub', { name: this.name })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/http/controllers/destroy.stub', { name: this.name })
  }
}
