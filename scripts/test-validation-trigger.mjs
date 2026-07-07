// Script di test per verificare il funzionamento del trigger validate_player_fields
// Esecuzione: node scripts/test-validation-trigger.mjs
// Gira SEMPRE contro lo stack Supabase locale (mai contro .env, che può puntare a
// produzione): usa le stesse credenziali demo pubbliche di `supabase start`.

import { createClient } from '@supabase/supabase-js'

const URL_ = 'http://127.0.0.1:54321'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

async function runTests() {
  console.log('Avvio dei test di integrazione per il trigger di validazione atleti...')

  // Recupera una stagione attiva dal database, creandone una di test se non ce n'è
  // nessuna (es. su un DB appena resettato senza seed.sql)
  const { data: seasons } = await admin.from('seasons').select('id').eq('is_active', true).limit(1)
  let seasonId = seasons?.[0]?.id
  if (!seasonId) {
    const { data: newSeason, error: seErr } = await admin.from('seasons')
      .insert({ name: 'TEST_VAL_SEASON', start_date: '2026-07-01', end_date: '2027-06-30', is_active: true })
      .select('id').single()
    if (seErr) {
      console.error('Errore creando una stagione di test:', seErr.message)
      process.exit(1)
    }
    seasonId = newSeason.id
  }
  console.log(`Stagione di test utilizzata (ID): ${seasonId}\n`)

  let failures = 0

  // Helper per inserimento atleta di test
  const insertPlayer = async (payload) => {
    return await admin.from('players').insert({ season_id: seasonId, ...payload }).select().single()
  }

  // ==========================================
  // TEST 1: Inserimento atleta maggiorenne completo (HAPPY PATH)
  // ==========================================
  console.log('--- TEST 1: Atleta maggiorenne completo (Happy Path) ---')
  const { data: p1, error: err1 } = await insertPlayer({
    first_name: 'TEST_VAL_MARIO',
    last_name: 'ROSSI',
    birth_date: '1990-01-01',
    birth_place: 'Genova',
    citizenship: 'Italiana',
    team_sector: 'Prima Squadra',
    address_street: 'Via Roma 1',
    address_city: 'Genova',
    address_zip: '16100',
    email: 'mario.rossi@example.com',
    phone_player: '3331122333',
    privacy_accepted: true,
    tax_code: 'RSSMRA90A01D969X'
  })

  if (err1) {
    console.error('❌ TEST 1 FALLITO: Inserimento maggiorenne rifiutato inaspettatamente:', err1.message)
    failures++
  } else {
    console.log('✅ TEST 1 SUPERATO: Atleta inserito correttamente. ID:', p1.id)
  }

  // ==========================================
  // TEST 2: Inserimento codice fiscale non valido (Formato Regex)
  // ==========================================
  console.log('\n--- TEST 2: Codice Fiscale invalido ---')
  const { data: p2, error: err2 } = await insertPlayer({
    first_name: 'TEST_VAL_MARIO',
    last_name: 'ROSSI',
    birth_date: '1990-01-01',
    birth_place: 'Genova',
    citizenship: 'Italiana',
    team_sector: 'Prima Squadra',
    address_street: 'Via Roma 1',
    address_city: 'Genova',
    address_zip: '16100',
    email: 'mario.rossi@example.com',
    phone_player: '3331122333',
    privacy_accepted: true,
    tax_code: 'RSSMRA90A01D969' // Mancano caratteri (15 invece di 16)
  })

  if (!err2) {
    console.error('❌ TEST 2 FALLITO: L\'atleta è stato inserito con codice fiscale non valido.')
    failures++
  } else {
    console.log('✅ TEST 2 SUPERATO: Errore corretto sollevato dal server ->', err2.message)
  }

  // ==========================================
  // TEST 3: Inserimento atleta minorenne senza contatti genitori
  // ==========================================
  console.log('\n--- TEST 3: Atleta minorenne senza contatti genitori ---')
  const { data: p3, error: err3 } = await insertPlayer({
    first_name: 'TEST_VAL_LUIGI',
    last_name: 'VERDI',
    birth_date: '2015-05-15',
    birth_place: 'Genova',
    citizenship: 'Italiana',
    team_sector: 'Primi Calci',
    address_street: 'Via Roma 2',
    address_city: 'Genova',
    address_zip: '16100',
    email: 'luigi.verdi@example.com',
    phone_player: '3331122334',
    privacy_accepted: true,
    tax_code: 'VRDLGU15E15D969J'
  })

  if (!err3) {
    console.error('❌ TEST 3 FALLITO: Il minorenne è stato salvato senza contatti dei genitori.')
    failures++
  } else {
    console.log('✅ TEST 3 SUPERATO: Errore corretto sollevato dal server ->', err3.message)
  }

  // ==========================================
  // TEST 4: Inserimento atleta minorenne con contatti genitore (HAPPY PATH)
  // ==========================================
  console.log('\n--- TEST 4: Atleta minorenne con genitore compilato (Happy Path) ---')
  const { data: p4, error: err4 } = await insertPlayer({
    first_name: 'TEST_VAL_LUIGI',
    last_name: 'VERDI',
    birth_date: '2015-05-15',
    birth_place: 'Genova',
    citizenship: 'Italiana',
    team_sector: 'Primi Calci',
    address_street: 'Via Roma 2',
    address_city: 'Genova',
    address_zip: '16100',
    email: 'luigi.verdi@example.com',
    phone_player: '3331122334',
    privacy_accepted: true,
    tax_code: 'VRDLGU15E15D969J',
    parent1_name: 'Mario Verdi',
    parent1_phone: '3339988776'
  })

  if (err4) {
    console.error('❌ TEST 4 FALLITO: Inserimento minorenne con genitore rifiutato:', err4.message)
    failures++
  } else {
    console.log('✅ TEST 4 SUPERATO: Atleta minorenne inserito correttamente. ID:', p4.id)
  }

  // ==========================================
  // TEST 5: Aggiornamento record esistente violando vincoli (cittadinanza vuota)
  // ==========================================
  console.log('\n--- TEST 5: Modifica atleta svuotando un campo obbligatorio ---')
  if (p1) {
    const { error: err5 } = await admin.from('players').update({ citizenship: '' }).eq('id', p1.id)
    if (!err5) {
      console.error('❌ TEST 5 FALLITO: La modifica è stata accettata con cittadinanza vuota.')
      failures++
    } else {
      console.log('✅ TEST 5 SUPERATO: Modifica rifiutata con errore ->', err5.message)
    }
  } else {
    console.log('⚠ TEST 5 SALTATO: Atleta del Test 1 non disponibile.')
  }

  // ==========================================
  // PULIZIA DATI
  // ==========================================
  console.log('\nPulizia degli atleti/stagioni di test...');
  const { error: errCleanup } = await admin.from('players').delete().like('first_name', 'TEST_VAL_%')
  await admin.from('seasons').delete().like('name', 'TEST_VAL_%')
  if (errCleanup) {
    console.error('Errore durante la pulizia dei dati di test:', errCleanup.message)
  } else {
    console.log('Pulizia completata con successo.')
  }

  console.log(`\n=== ESITO DEI TEST ===`)
  console.log(failures === 0 ? '🟢 Tutti i test del database sono SUPERATI!' : `🔴 Ci sono stati ${failures} fallimenti.`);
  process.exit(failures === 0 ? 0 : 1)
}

runTests().catch(console.error)
