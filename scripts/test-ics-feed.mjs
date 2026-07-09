// Test di integrazione per il feed iCal (US-014)
// Esecuzione: node scripts/test-ics-feed.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminClient = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const randomSuffix = randomBytes(4).toString('hex')
const PASSWORD = `Ics!${randomBytes(24).toString('base64url')}`
const EMAIL = `test-ics-${randomSuffix}@propontedecimo.test`

const results = []
let failures = 0

function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function cleanup() {
  console.log('Cleanup: rimozione utenti e dati di test...')
  // Elimina eventi creati per il test
  await adminClient.from('events').delete().like('title', 'TEST_ICS_%')
  
  // Trova e cancella l'utente di test
  const { data } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-ics-') && u.email?.endsWith('@propontedecimo.test')) {
      await adminClient.from('profiles').delete().eq('id', u.id)
      await adminClient.auth.admin.deleteUser(u.id)
    }
  }
}

async function run() {
  try {
    await cleanup()

    console.log('Setup: creazione utente di test...')
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true
    })
    
    if (userError) throw new Error(`Errore creazione utente: ${userError.message}`)
    const userId = userData.user.id

    // Crea profilo per l'utente (ruolo parent/genitore)
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      email: EMAIL,
      full_name: 'TEST_ICS_PARENT',
      role: 'parent'
    })
    if (profileError) throw new Error(`Errore creazione profilo: ${profileError.message}`)

    // Crea client autenticato per l'utente di test
    const userClient = createClient(URL_, ANON, { auth: { persistSession: false } })
    const { error: loginError } = await userClient.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    })
    if (loginError) throw new Error(`Errore login utente: ${loginError.message}`)

    console.log('Verifica iniziale token...')
    // Recuperiamo il profilo dell'utente
    const { data: initialProfile, error: getError } = await userClient
      .from('profiles')
      .select('ics_token')
      .eq('id', userId)
      .single()
    
    if (getError) throw new Error(`Errore recupero profilo: ${getError.message}`)
    check('Token iniziale deve essere null', initialProfile.ics_token === null, `Trovato: ${initialProfile.ics_token}`)

    // Generazione del token tramite RPC
    console.log('Generazione token tramite RPC...')
    const { data: token1, error: rpcError } = await userClient.rpc('regenerate_ics_token')
    if (rpcError) throw new Error(`Errore RPC regenerate_ics_token: ${rpcError.message}`)
    check('Token generato correttamente', typeof token1 === 'string' && token1.length > 0, `Token: ${token1}`)

    // Verifica che sia stato salvato sul profilo
    const { data: profileAfterRegen } = await userClient
      .from('profiles')
      .select('ics_token')
      .eq('id', userId)
      .single()
    check('Token salvato nel profilo corrisponde', profileAfterRegen.ics_token === token1)

    // Inseriamo eventi di test
    console.log('Setup eventi di test...')
    // 1. Partita in casa (con meetup_time)
    const meetupTime = new Date('2026-07-15T15:00:00Z').toISOString()
    const matchStartTime = new Date('2026-07-15T16:00:00Z').toISOString()
    const { error: e1 } = await adminClient.from('events').insert({
      title: 'TEST_ICS_PARTITA_CASA',
      description: 'Partita di campionato contro Sampdoria',
      event_type: 'home_match',
      start_date: matchStartTime,
      meetup_time: meetupTime,
      created_by: userId
    })
    if (e1) throw e1

    // 2. Allenamento (senza meetup_time)
    const trainingTime = new Date('2026-07-16T17:30:00Z').toISOString()
    const { error: e2 } = await adminClient.from('events').insert({
      title: 'TEST_ICS_ALLENAMENTO',
      description: 'Allenamento pomeridiano',
      event_type: 'training',
      start_date: trainingTime,
      created_by: userId
    })
    if (e2) throw e2

    // Chiamata all'endpoint Edge Function ics-feed con il token valido
    console.log('Chiamata a Edge Function con token valido...')
    const feedUrl = `${URL_}/functions/v1/ics-feed?token=${token1}`
    const response = await fetch(feedUrl)
    check('Status 200 per token valido', response.status === 200, `Status: ${response.status}`)
    
    const contentType = response.headers.get('content-type') || ''
    check('Content-Type corretto per feed iCal', contentType.includes('text/calendar'), `Content-Type: ${contentType}`)

    const body = await response.text()
    check('Contiene intestazione VCALENDAR', body.includes('BEGIN:VCALENDAR'))
    check('Contiene chiusura VCALENDAR', body.includes('END:VCALENDAR'))
    check('Contiene evento partita', body.includes('SUMMARY:TEST_ICS_PARTITA_CASA'))
    check('Contiene evento allenamento', body.includes('SUMMARY:TEST_ICS_ALLENAMENTO'))

    // Verifica dettagli partita in DESCRIPTION (orari ritrovo e inizio)
    check('Partita ha orario di ritrovo corretto', body.includes('Ritrovo: 17:00'), 'Ritrovo mancante o errato')
    check('Partita ha orario inizio gara corretto', body.includes('Inizio gara: 18:00'), 'Inizio gara mancante o errato')
    
    // Verifica DTSTART per partita (dovrebbe essere meetup_time: 20260715T150000Z)
    check('DTSTART partita usa meetup_time', body.includes('DTSTART:20260715T150000Z'))
    // Verifica DTSTART per allenamento (dovrebbe essere start_date: 20260716T173000Z)
    check('DTSTART allenamento usa start_date', body.includes('DTSTART:20260716T173000Z'))

    // Verifica DTEND: per le partite deve essere calcolato da start_date (inizio gara, 16:00Z)
    // + 2h, non da meetup_time (15:00Z) + 2h — altrimenti l'evento risulterebbe concluso
    // subito dopo il fischio d'inizio con ritrovi molto anticipati.
    check('DTEND partita calcolato da start_date (inizio gara), non da meetup_time', body.includes('DTEND:20260715T180000Z'))
    // Allenamento: start_date 17:30Z + 1h30 = 19:00Z
    check('DTEND allenamento calcolato correttamente', body.includes('DTEND:20260716T190000Z'))

    // Chiamata all'endpoint con token invalido o mancante
    console.log('Chiamata con token invalido...')
    const invalidToken = '00000000-0000-0000-0000-000000000000'
    const resInvalid = await fetch(`${URL_}/functions/v1/ics-feed?token=${invalidToken}`)
    check('Status 404 per token inesistente', resInvalid.status === 404, `Status: ${resInvalid.status}`)

    console.log('Chiamata senza token...')
    const resNoToken = await fetch(`${URL_}/functions/v1/ics-feed`)
    check('Status 404 per token assente', resNoToken.status === 404, `Status: ${resNoToken.status}`)

    // Rigenerazione token
    console.log('Rigenerazione del token...')
    const { data: token2, error: rpcError2 } = await userClient.rpc('regenerate_ics_token')
    if (rpcError2) throw new Error(`Errore RPC regenerate_ics_token 2: ${rpcError2.message}`)
    check('Nuovo token rigenerato', token2 !== token1)

    // Vecchio token deve tornare 404
    console.log('Chiamata con vecchio token rigenerato...')
    const resOldToken = await fetch(`${URL_}/functions/v1/ics-feed?token=${token1}`)
    check('Status 404 per token precedente invalidato', resOldToken.status === 404, `Status: ${resOldToken.status}`)

    // Nuovo token deve funzionare
    console.log('Chiamata con nuovo token...')
    const resNewToken = await fetch(`${URL_}/functions/v1/ics-feed?token=${token2}`)
    check('Status 200 per nuovo token', resNewToken.status === 200, `Status: ${resNewToken.status}`)

  } catch (error) {
    console.error('Errore durante i test:', error)
    failures++
  } finally {
    await cleanup()
  }

  console.log('\n--- Risultati del Test ---')
  console.log(results.join('\n'))
  console.log(`\nEsito: ${failures === 0 ? 'SUCCESS' : 'FAILURE'} (${failures} errori)`)
  process.exit(failures === 0 ? 0 : 1)
}

run()
