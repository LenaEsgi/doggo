import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { execa } from 'execa'

const STUBS_ROOT = '../stubs'

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

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/domain/value-objects/id.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/domain/exceptions/id.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/domain/exceptions/not_found.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/domain/contracts/repository.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/create.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/update.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/show.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/destroy.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/dto/output.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/create.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/show.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/index.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/update.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/application/usecases/destroy.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(
      STUBS_ROOT,
      'modules/infrastructure/http/controllers/create.stub',
      { name: this.name }
    )
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/http/controllers/show.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/http/controllers/index.stub', {
      name: this.name,
    })
    await codemods.makeUsingStub(
      STUBS_ROOT,
      'modules/infrastructure/http/controllers/update.stub',
      { name: this.name }
    )
    await codemods.makeUsingStub(
      STUBS_ROOT,
      'modules/infrastructure/http/controllers/destroy.stub',
      { name: this.name }
    )

    await codemods.makeUsingStub(
      STUBS_ROOT,
      'modules/infrastructure/http/transformers/transformer.stub',
      {
        name: this.name,
      }
    )

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/http/validators/create.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/http/validators/update.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(STUBS_ROOT, 'modules/infrastructure/database/models/model.stub', {
      name: this.name,
    })

    await codemods.makeUsingStub(
      STUBS_ROOT,
      'modules/infrastructure/database/repositories/repository.stub',
      {
        name: this.name,
      }
    )

    const modulePath = `app/modules/${this.name}`

    this.logger.info('Running ESLint fix...')

    try {
      await execa('npx', ['eslint', modulePath, '--fix'])
      this.logger.success('Linting complete')
    } catch (error) {
      this.logger.warning('Could not run ESLint fix automatically')
    }
  }
}
