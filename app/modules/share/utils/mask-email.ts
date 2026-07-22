/**
 * Masque la partie locale d'un email pour les logs (RGPD) tout en gardant
 * le domaine, utile pour corréler des incidents sans exposer l'email en clair.
 * Ex: "john.doe@example.com" -> "j***@example.com"
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) {
    return '***'
  }

  const localPart = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)

  return `${localPart[0]}***@${domain}`
}
