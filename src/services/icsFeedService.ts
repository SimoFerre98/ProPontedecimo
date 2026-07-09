import { supabase } from '@/lib/supabase'

export const icsFeedService = {
  /**
   * Recupera il token iCal corrente dell'utente autenticato dalla tabella profiles.
   */
  async getIcsToken(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utente non autenticato')

    const { data, error } = await supabase
      .from('profiles')
      .select('ics_token')
      .eq('id', user.id)
      .single()

    if (error) throw error
    return data?.ics_token || null
  },

  /**
   * Richiama la RPC regenerate_ics_token() per rigenerare il token dell'utente corrente.
   */
  async regenerateIcsToken(): Promise<string> {
    const { data, error } = await supabase.rpc('regenerate_ics_token')

    if (error) throw error
    if (!data) throw new Error('Impossibile rigenerare il token')
    return data
  },

  /**
   * Costruisce l'URL pubblico per il feed iCal a partire dal token dell'utente.
   */
  buildIcsUrl(token: string): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    // Pulisce eventuali slash finali dal supabaseUrl
    const baseUrl = supabaseUrl.replace(/\/$/, '')
    return `${baseUrl}/functions/v1/ics-feed?token=${token}`
  }
}
