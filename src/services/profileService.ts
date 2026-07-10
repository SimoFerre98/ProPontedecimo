import { supabase } from '@/lib/supabase'

function mapAuthError(error: { message?: string }): Error {
  const message = error.message || ''
  if (message.toLowerCase().includes('password should be') || message.toLowerCase().includes('password must be') || message.toLowerCase().includes('least 6 characters')) {
    return new Error('La password deve contenere almeno 6 caratteri.')
  }
  if (
    message.toLowerCase().includes('email_exists') || 
    message.toLowerCase().includes('already registered') || 
    message.toLowerCase().includes('user already exists') || 
    message.toLowerCase().includes('already exists')
  ) {
    return new Error('Questo indirizzo email è già associato a un altro account.')
  }
  if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many requests')) {
    return new Error('Troppi tentativi. Riprova più tardi.')
  }
  return new Error(error.message || 'Si è verificato un errore durante l\'aggiornamento.')
}

export const profileService = {
  async updateFullName(fullName: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Utente non autenticato.')
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: fullName.trim(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id)

    if (error) {
      throw new Error(error.message || 'Impossibile aggiornare il nome completo.')
    }
  },

  async updateEmail(email: string) {
    const { data, error } = await supabase.auth.updateUser({ email: email.trim() })
    if (error) {
      throw mapAuthError(error)
    }
    return data
  },

  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) {
      throw mapAuthError(error)
    }
    return data
  },

  async cancelPendingEmail(currentEmail: string) {
    const { data, error } = await supabase.auth.updateUser({ email: currentEmail.trim() })
    if (error) {
      throw mapAuthError(error)
    }
    return data
  }
}
