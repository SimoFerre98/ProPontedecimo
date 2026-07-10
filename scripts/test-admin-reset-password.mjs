import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `Reset!${randomBytes(24).toString('base64url')}`
const emailFor = (name) => `test-reset-${name}@propontedecimo.test`

const results = []
let failures = 0
function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function cleanup() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-reset-') && u.email?.endsWith('@propontedecimo.test')) {
      await admin.from('profiles').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  }
}

async function runTests() {
  console.log('Avvio dei test di integrazione per admin-reset-password edge function (US-019)...')

  await cleanup()

  // 1. Creiamo un utente President
  const emailPresident = emailFor('president')
  const { data: presData, error: presError } = await admin.auth.admin.createUser({
    email: emailPresident,
    password: PASSWORD,
    email_confirm: true,
  })
  if (presError) {
    console.error('Errore creazione president:', presError.message)
    process.exit(1)
  }
  // Forziamo il ruolo a president
  await admin.from('profiles').update({ role: 'president' }).eq('id', presData.user.id)

  // 2. Creiamo un utente Director
  const emailDirector = emailFor('director')
  const { data: dirData, error: dirError } = await admin.auth.admin.createUser({
    email: emailDirector,
    password: PASSWORD,
    email_confirm: true,
  })
  if (dirError) {
    console.error('Errore creazione director:', dirError.message)
    process.exit(1)
  }
  // Forziamo il ruolo a director
  await admin.from('profiles').update({ role: 'director' }).eq('id', dirData.user.id)

  // 3. Creiamo un utente Player
  const emailPlayer = emailFor('player')
  const { data: playData, error: playError } = await admin.auth.admin.createUser({
    email: emailPlayer,
    password: PASSWORD,
    email_confirm: true,
  })
  if (playError) {
    console.error('Errore creazione player:', playError.message)
    process.exit(1)
  }
  // Forziamo il ruolo a coach
  await admin.from('profiles').update({ role: 'coach' }).eq('id', playData.user.id)

  // Sign in as President
  const clientPresident = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data: presSession, error: loginPresError } = await clientPresident.auth.signInWithPassword({ email: emailPresident, password: PASSWORD })
  if (loginPresError) {
    console.error('Errore login come president:', loginPresError.message)
    process.exit(1)
  }

  // Sign in as Player (Coach)
  const clientPlayer = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data: playSession, error: loginPlayError } = await clientPlayer.auth.signInWithPassword({ email: emailPlayer, password: PASSWORD })
  if (loginPlayError) {
    console.error('Errore login come player/coach:', loginPlayError.message)
    process.exit(1)
  }

  // TEST 1: Chiamata senza Authorization Header -> 401
  console.log('\n--- TEST 1: Chiamata senza Authorization Header ---')
  try {
    const res = await fetch(`${URL_}/functions/v1/admin-reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: emailPlayer })
    })
    check('Chiamata senza autorizzazione', res.status === 401, `Status ricevuto: ${res.status}`)
  } catch (err) {
    check('Chiamata senza autorizzazione', false, err.message)
  }

  // TEST 2: Chiamata con ruolo non autorizzato (coach) -> 403
  console.log('\n--- TEST 2: Chiamata con ruolo non autorizzato ---')
  try {
    const res = await fetch(`${URL_}/functions/v1/admin-reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${playSession.session.access_token}`
      },
      body: JSON.stringify({ email: emailPlayer })
    })
    check('Chiamata da ruolo non autorizzato (coach)', res.status === 403, `Status ricevuto: ${res.status}`)
  } catch (err) {
    check('Chiamata da ruolo non autorizzato (coach)', false, err.message)
  }

  // TEST 3: Chiamata con ruolo autorizzato (president) -> 200
  console.log('\n--- TEST 3: Chiamata con ruolo autorizzato (president) ---')
  let recoveryTriggered = false
  try {
    const res = await fetch(`${URL_}/functions/v1/admin-reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${presSession.session.access_token}`
      },
      body: JSON.stringify({
        email: emailPlayer,
        redirectTo: `${URL_}/recovery`
      })
    })
    const body = await res.json()
    recoveryTriggered = res.status === 200
    check('Chiamata da ruolo autorizzato (president)', res.status === 200, `Status ricevuto: ${res.status}, body: ${JSON.stringify(body)}`)
  } catch (err) {
    check('Chiamata da ruolo autorizzato (president)', false, err.message)
  }

  // TEST 4: E2E - Recupero password da Mailpit + reset password + login
  console.log('\n--- TEST 4: E2E - Recupero password da Mailpit ---')
  if (!recoveryTriggered) {
    check('E2E - Recupero password da Mailpit', false, 'Salto il test perché il trigger non è andato a buon fine.')
  } else {
    try {
      // 1. Aspetta che Mailpit riceva l'email
      console.log('Attendo 2 secondi che Mailpit riceva l\'email...')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 2. Fetch dei messaggi da Mailpit (port 54324)
      const messagesRes = await fetch('http://127.0.0.1:54324/api/v1/messages')
      const { messages } = await messagesRes.json()
      
      // Troviamo il messaggio inviato all'utente di test
      const userMsg = messages.find(m => m.To && m.To.some(to => to.Address === emailPlayer))
      if (!userMsg) {
        throw new Error(`Nessun messaggio trovato per ${emailPlayer} su Mailpit.`)
      }

      // 3. Otteniamo il corpo HTML dell'email
      const msgRes = await fetch(`http://127.0.0.1:54324/api/v1/message/${userMsg.ID}`)
      const msgData = await msgRes.json()
      const html = msgData.HTML

      // 4. Estraiamo il link di verifica
      const match = html.match(/href="([^"]+)"/)
      if (!match) {
        throw new Error('Nessun link di reset password trovato nel corpo dell\'email.')
      }
      const verifyUrl = match[1].replace(/&amp;/g, '&')
      console.log(`URL di verifica estratto: ${verifyUrl}`)

      // 5. Chiamiamo il link per innescare il redirect con i token di sessione
      const redirectRes = await fetch(verifyUrl, { redirect: 'manual' })
      const location = redirectRes.headers.get('location')
      if (!location) {
        throw new Error('Nessun redirect location header restituito dal server auth.')
      }

      // 6. Estraiamo access_token e refresh_token dalla hash del redirect
      const hashIndex = location.indexOf('#')
      if (hashIndex === -1) {
        throw new Error(`Location URL non contiene un fragment hash: ${location}`)
      }
      const hash = location.substring(hashIndex + 1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken) {
        throw new Error(`Nessun access_token trovato nel redirect URL: ${location}`)
      }

      // 7. Autentichiamo un nuovo client Supabase usando la sessione di recupero
      console.log('Autenticazione client Supabase con token di recupero...')
      const clientRecovered = createClient(URL_, ANON, { auth: { persistSession: false } })
      const { error: sessionError } = await clientRecovered.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (sessionError) {
        throw new Error(`Impossibile impostare la sessione: ${sessionError.message}`)
      }

      // 8. Eseguiamo l'aggiornamento della password
      console.log('Aggiornamento della password in corso...')
      const NEW_PLAYER_PASSWORD = 'NewSuperPassword123!'
      const { error: updateError } = await clientRecovered.auth.updateUser({ password: NEW_PLAYER_PASSWORD })
      check('Aggiornamento password con sessione di recupero', !updateError, updateError?.message)

      // 9. Verifichiamo che possiamo accedere con la nuova password
      console.log('Verifica accesso con la nuova password...')
      const clientLogin = createClient(URL_, ANON, { auth: { persistSession: false } })
      const { error: loginNewError } = await clientLogin.auth.signInWithPassword({
        email: emailPlayer,
        password: NEW_PLAYER_PASSWORD
      })
      check('Accesso con la nuova password', !loginNewError, loginNewError?.message)

    } catch (err) {
      check('E2E - Recupero password da Mailpit', false, err.message)
    }
  }

  // Pulizia
  console.log('\nPulizia utenti di test...')
  await cleanup()
  console.log('Pulizia completata.')

  console.log('\n=== RISULTATI TEST RESET PASSWORD ===')
  results.forEach(r => console.log(r))
  console.log(`\nEsito: ${failures === 0 ? '🟢 SUPERATO' : '🔴 FALLITO'}`)
  process.exit(failures === 0 ? 0 : 1)
}

runTests().catch(console.error)
