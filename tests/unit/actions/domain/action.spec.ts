import { test } from '@japa/runner'
import Action from '#app/modules/actions/domain/action.entity'
import { InvalidActionParametersError } from '#app/modules/actions/domain/exceptions/invalid-action-parameters.error'
import type { ActionParameterSchema } from '#app/modules/actions/domain/value-objects/action-parameter-schema'

test.group('Unit | Actions | ActionEntity', () => {
  test('it should create a new action with generated ID and uppercase code', ({ assert }) => {
    const action = Action.create('act01', 'My Action', 'my-action', 'Description')

    assert.equal(action.code, 'ACT01')
    assert.equal(action.name, 'My Action')
    assert.equal(action.slug, 'my-action')
    assert.equal(action.description, 'Description')
  })

  test('it should rehydrate an existing action', ({ assert }) => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const action = Action.rehydrate(id, 'CODE', 'Name', 'slug', null)

    assert.equal(action.id.toString(), id)
    assert.equal(action.code, 'CODE')
    assert.isNull(action.description)
  })

  test('it should update the name and trim white spaces', ({ assert }) => {
    const action = Action.create('ACT', 'Old Name', 'slug', null)
    action.updateName('  New Name  ')

    assert.equal(action.name, 'New Name')
  })

  test('it should throw an error when updating name with invalid length', ({ assert }) => {
    const action = Action.create('ACT', 'Name', 'slug', null)

    const tooLongName = 'a'.repeat(51)

    assert.throws(() => action.updateName(''), 'must be between 1 and 50 characters')
    assert.throws(() => action.updateName(tooLongName), 'must be between 1 and 50 characters')
  })

  test('it should update the slug in lowercase', ({ assert }) => {
    const action = Action.create('ACT', 'Name', 'old-slug', null)
    action.updateSlug('NEW-SLUG')

    assert.equal(action.slug, 'new-slug')
  })

  test('it should throw an error when slug contains spaces', ({ assert }) => {
    const action = Action.create('ACT', 'Name', 'slug', null)

    assert.throws(() => action.updateSlug('invalid slug'), 'should not contain spaces')
  })

  test('it should update the description', ({ assert }) => {
    const action = Action.create('ACT', 'Name', 'slug', 'old')
    action.updateDescription('new description')
    assert.equal(action.description, 'new description')

    action.updateDescription(null)
    assert.isNull(action.description)
  })

  // -------------------
  // validateParameters
  // -------------------

  const moveSchema: ActionParameterSchema = {
    fields: [
      {
        name: 'distance_cm',
        label: 'Distance',
        type: 'number',
        required: true,
        unit: 'cm',
        min: 1,
        max: 5000,
      },
    ],
  }

  test('validateParameters — paramètres valides ne throw pas', ({ assert }) => {
    const action = Action.create('MOVE', 'Move', 'move', null, moveSchema)
    assert.doesNotThrow(() => action.validateParameters('{"distance_cm": 100}'))
  })

  test('validateParameters — champ requis absent → InvalidActionParametersError', ({ assert }) => {
    const action = Action.create('MOVE', 'Move', 'move', null, moveSchema)
    assert.throws(() => action.validateParameters('{}'), InvalidActionParametersError)
  })

  test('validateParameters — mauvais type (string au lieu de number) → throw', ({ assert }) => {
    const action = Action.create('MOVE', 'Move', 'move', null, moveSchema)
    assert.throws(
      () => action.validateParameters('{"distance_cm": "cent"}'),
      InvalidActionParametersError
    )
  })

  test('validateParameters — number en dessous du min → throw', ({ assert }) => {
    const action = Action.create('MOVE', 'Move', 'move', null, moveSchema)
    assert.throws(
      () => action.validateParameters('{"distance_cm": 0}'),
      InvalidActionParametersError
    )
  })

  test('validateParameters — number au-dessus du max → throw', ({ assert }) => {
    const action = Action.create('MOVE', 'Move', 'move', null, moveSchema)
    assert.throws(
      () => action.validateParameters('{"distance_cm": 9999}'),
      InvalidActionParametersError
    )
  })

  test("validateParameters — sans schema, accepte n'importe quel JSON", ({ assert }) => {
    const action = Action.create('CUSTOM', 'Custom', 'custom', null, null)
    assert.doesNotThrow(() => action.validateParameters('{"anything": true, "foo": 42}'))
  })

  test('validateParameters — JSON invalide → throw', ({ assert }) => {
    const action = Action.create('MOVE', 'Move', 'move', null, moveSchema)
    assert.throws(() => action.validateParameters('not-json'), InvalidActionParametersError)
  })
})
