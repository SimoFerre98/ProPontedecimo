// Script di test per verificare le impostazioni del profilo utente (US-018)
// Esecuzione: node scripts/test-profile-settings.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `Profile!${randomBytes(24).toString('base64url')}`
const emailFor = (name) => `test-profile-${name}@propontedecimo.test`

const results = []
let failures = 0
function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function cleanup() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-profile-') && u.email?.endsWith('@propontedecimo.test')) {
      await admin.from('profiles').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  }
}

async function runTests() {
  console.log('Avvio dei test di integrazione per le impostazioni profilo (US-018)...')
  
  await cleanup()

  // 1. Creiamo un utente di test (ruolo player di default)
  const emailVal = emailFor('player')
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: emailVal,
    password: PASSWORD,
    email_confirm: true,
  })

  if (userError) {
    console.error('Errore creazione utente di test:', userError.message)
    process.exit(1)
  }

  const userId = userData.user.id
  console.log(`Utente creato: ${emailVal} (ID: ${userId})`)

  // Log in as player
  const client = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: loginError } = await client.auth.signInWithPassword({ email: emailVal, password: PASSWORD })
  if (loginError) {
    console.error('Errore login come player:', loginError.message)
    process.exit(1)
  }

  // TEST 1: Modifica consentita del proprio nome
  console.log('\n--- TEST 1: Modifica consentita del proprio nome ---')
  const { error: errUpdateName } = await client
    .from('profiles')
    .update({ full_name: 'TEST_PROFILE_PLAYER_NEW_NAME' })
    .eq('id', userId)

  if (errUpdateName) {
    check('Modifica nome proprio profilo', false, errUpdateName.message)
  } else {
    // Verifica effettiva scrittura
    const { data: pData } = await client.from('profiles').select('full_name').eq('id', userId).single()
    check('Modifica nome proprio profilo', pData?.full_name === 'TEST_PROFILE_PLAYER_NEW_NAME', `Nome nel DB: ${pData?.full_name}`)
  }

  // TEST 2: Tentativo di modifica del proprio ruolo (deve essere bloccato)
  console.log('\n--- TEST 2: Tentativo di escalation di ruolo (blocco) ---')
  const { error: errUpdateRole } = await client
    .from('profiles')
    .update({ role: 'president' })
    .eq('id', userId)

  if (errUpdateRole) {
    check('Blocco escalation di ruolo (self-update role)', true, `Bloccato con errore atteso: ${errUpdateRole.message}`)
  } else {
    // Verifica se il ruolo è cambiato davvero
    const { data: pData } = await admin.from('profiles').select('role').eq('id', userId).single()
    const roleEscalated = pData?.role === 'president'
    check('Blocco escalation di ruolo (self-update role)', !roleEscalated, `Errore: il ruolo è stato modificato in ${pData?.role}`)
  }

  // TEST 3: Sincronizzazione email dopo update su auth.users
  console.log('\n--- TEST 3: Sincronizzazione email dopo update su auth.users ---')
  const newEmailVal = emailFor('player-new-email')
  
  // Eseguiamo update email via admin (simula il flusso di GoTrue dopo le conferme)
  const { error: errUpdateAuthEmail } = await admin.auth.admin.updateUserById(userId, {
    email: newEmailVal,
  })

  if (errUpdateAuthEmail) {
    check('Update email su auth.users', false, errUpdateAuthEmail.message)
  } else {
    // Il trigger di sincronizzazione dovrebbe aggiornare profiles.email in modo asincrono / immediato
    // Controlliamo il record in public.profiles
    const { data: pData, error: errFetchProfile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (errFetchProfile) {
      check('Verifica sincronizzazione email su profiles', false, errFetchProfile.message)
    } else {
      check('Verifica sincronizzazione email su profiles', pData?.email === newEmailVal, `Email in profiles: ${pData?.email}, atteso: ${newEmailVal}`)
    }
  }

  // Pulizia
  console.log('\nPulizia utenti di test...')
  await cleanup()
  console.log('Pulizia completata.')

  console.log('\n=== RISULTATI TEST PROFILO ===')
  results.forEach(r => console.log(r))
  console.log(`\nEsito: ${failures === 0 ? '🟢 SUPERATO' : '🔴 FALLITO'}`)
  process.exit(failures === 0 ? 0 : 1)
}

runTests().catch(console.error)
