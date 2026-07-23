import { test } from '@japa/runner'
import { compareSemver, isValidSemver } from '#app/modules/share/utils/semver'

test.group('compareSemver', () => {
  test('retourne 0 pour deux versions identiques', ({ assert }) => {
    assert.equal(compareSemver('1.2.3', '1.2.3'), 0)
  })

  test('retourne positif quand le patch est supérieur', ({ assert }) => {
    assert.isAbove(compareSemver('1.2.3', '1.2.2'), 0)
  })

  test('retourne négatif quand le patch est inférieur', ({ assert }) => {
    assert.isBelow(compareSemver('1.2.2', '1.2.3'), 0)
  })

  test('le minor prime sur le patch', ({ assert }) => {
    assert.isAbove(compareSemver('1.5.0', '1.4.9'), 0)
  })

  test('le major prime sur le minor et le patch', ({ assert }) => {
    assert.isAbove(compareSemver('2.0.0', '1.9.9'), 0)
  })

  test('tolère les composants manquants (traités comme 0)', ({ assert }) => {
    assert.equal(compareSemver('1.2', '1.2.0'), 0)
  })
})

test.group('isValidSemver', () => {
  test('accepte un format major.minor.patch', ({ assert }) => {
    assert.isTrue(isValidSemver('1.4.2'))
  })

  test('accepte un format major.minor', ({ assert }) => {
    assert.isTrue(isValidSemver('1.4'))
  })

  test('rejette une chaîne vide', ({ assert }) => {
    assert.isFalse(isValidSemver(''))
  })

  test('rejette un format non numérique', ({ assert }) => {
    assert.isFalse(isValidSemver('v1.2.3'))
  })

  test('rejette un composant non numérique', ({ assert }) => {
    assert.isFalse(isValidSemver('1.x.3'))
  })
})
