/**
 * Compare deux versions "major.minor.patch". Retourne un nombre négatif si a < b,
 * positif si a > b, 0 si égales. Composants manquants ou non-numériques traités
 * comme 0 (tolérant : "1.2" se compare comme "1.2.0").
 */
export function compareSemver(a: string, b: string): number {
  const partsA = a.split('.').map((p) => Number.parseInt(p, 10) || 0)
  const partsB = b.split('.').map((p) => Number.parseInt(p, 10) || 0)

  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** Valide un format "major.minor.patch" ou "major.minor" (1 à 3 composants numériques). */
export function isValidSemver(value: string): boolean {
  return /^\d+(\.\d+){1,2}$/.test(value)
}
