import { BaseTransformer } from '@adonisjs/core/transformers'
import type Action from '#app/modules/actions/domain/action.entity'

export default class ActionTransformer extends BaseTransformer<Action> {
  toObject() {
    return {
      id: this.resource.id.value,
      code: this.resource.code,
      name: this.resource.name,
      description: this.resource.description,
    }
  }
}
