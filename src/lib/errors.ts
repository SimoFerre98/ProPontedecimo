const FALLBACK_MESSAGE = 'Si è verificato un errore imprevisto. Riprova.'

// I messaggi delle RPC Supabase arrivano già in italiano leggibile (RAISE EXCEPTION):
// vanno mostrati as-is, senza traduzione. Solo per errori generici/di rete si usa il fallback.
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error.trim() !== '') {
    return error
  }
  return FALLBACK_MESSAGE
}
