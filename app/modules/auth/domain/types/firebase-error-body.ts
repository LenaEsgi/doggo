export type FirebaseErrorBody = {
  error?: {
    message?: string
    details?: Array<Record<string, unknown>>
  }
}
