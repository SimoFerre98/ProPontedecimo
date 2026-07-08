// Script di test per verificare il filtro e il conteggio degli atleti con matricola mancante (US-011)
// Esecuzione: node scripts/test-registration-missing.mjs

import { createClient } from '@supabase/supabase-js'

const URL_ = 'http://127.0.0.1:54321'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

async function runTests() {
  console.log('Avvio test di integrazione per filtro/conteggio matricola mancante (US-011)...')
  let failures = 0
  let seasonId = null
  let otherSeasonId = null

  try {
    // 1. Crea una stagione di test temporanea (es. TEST_REG_SEASON)
    console.log('Creazione delle stagioni di test...')
    const { data: newSeason, error: seErr } = await admin.from('seasons')
      .insert({ name: 'TEST_REG_SEASON', start_date: '2026-07-01', end_date: '2027-06-30', is_active: true })
      .select('id').single()
    if (seErr) {
      throw new Error(`Errore creando stagione TEST_REG_SEASON: ${seErr.message}`)
    }
    seasonId = newSeason.id
    console.log(`Stagione TEST_REG_SEASON creata con ID: ${seasonId}`)

    // Crea un'altra stagione di test per testare l'isolamento (Player 4)
    const { data: otherSeason, error: otherSeErr } = await admin.from('seasons')
      .insert({ name: 'TEST_REG_SEASON_OTHER', start_date: '2026-07-01', end_date: '2027-06-30', is_active: false })
      .select('id').single()
    if (otherSeErr) {
      throw new Error(`Errore creando stagione TEST_REG_SEASON_OTHER: ${otherSeErr.message}`)
    }
    otherSeasonId = otherSeason.id
    console.log(`Stagione TEST_REG_SEASON_OTHER creata con ID: ${otherSeasonId}`)

    // Payload base per atleta di test valido
    const basePlayer = {
      birth_date: '1990-01-01',
      birth_place: 'Genova',
      citizenship: 'Italiana',
      team_sector: 'Prima Squadra',
      address_street: 'Via Roma 1',
      address_city: 'Genova',
      address_zip: '16100',
      email: 'test.reg@example.com',
      phone_player: '3331122333',
      privacy_accepted: true
    }

    // 2. Inserimento atleti di test
    // Player 1: attivo (is_active: true), figc_registration: null (deve essere contato/restituito)
    console.log('\nInserimento Player 1 (attivo, matricola mancante)...')
    const { data: p1, error: p1Err } = await admin.from('players').insert({
      ...basePlayer,
      first_name: 'TEST_REG_P1',
      last_name: 'PLAYER1',
      tax_code: 'RSSMRA90A01D969A',
      is_active: true,
      figc_registration: null,
      season_id: seasonId
    }).select().single()
    if (p1Err) throw new Error(`Errore inserimento Player 1: ${p1Err.message}`)
    console.log(`Player 1 inserito. ID: ${p1.id}`)

    // Player 2: attivo (is_active: true), figc_registration: '12345' (NON deve essere contato/restituito)
    console.log('Inserimento Player 2 (attivo, matricola presente)...')
    const { data: p2, error: p2Err } = await admin.from('players').insert({
      ...basePlayer,
      first_name: 'TEST_REG_P2',
      last_name: 'PLAYER2',
      tax_code: 'RSSMRA90A01D969B',
      is_active: true,
      figc_registration: '12345',
      season_id: seasonId
    }).select().single()
    if (p2Err) throw new Error(`Errore inserimento Player 2: ${p2Err.message}`)
    console.log(`Player 2 inserito. ID: ${p2.id}`)

    // Player 3: inattivo (is_active: false), figc_registration: null (NON deve essere contato/restituito)
    console.log('Inserimento Player 3 (inattivo, matricola mancante)...')
    const { data: p3, error: p3Err } = await admin.from('players').insert({
      ...basePlayer,
      first_name: 'TEST_REG_P3',
      last_name: 'PLAYER3',
      tax_code: 'RSSMRA90A01D969C',
      is_active: false,
      figc_registration: null,
      season_id: seasonId
    }).select().single()
    if (p3Err) throw new Error(`Errore inserimento Player 3: ${p3Err.message}`)
    console.log(`Player 3 inserito. ID: ${p3.id}`)

    // Player 4: attivo (is_active: true), figc_registration: null in un'altra stagione (verifica isolamento)
    console.log('Inserimento Player 4 (attivo, matricola mancante, altra stagione)...')
    const { data: p4, error: p4Err } = await admin.from('players').insert({
      ...basePlayer,
      first_name: 'TEST_REG_P4',
      last_name: 'PLAYER4',
      tax_code: 'RSSMRA90A01D969D',
      is_active: true,
      figc_registration: null,
      season_id: otherSeasonId
    }).select().single()
    if (p4Err) throw new Error(`Errore inserimento Player 4: ${p4Err.message}`)
    console.log(`Player 4 inserito. ID: ${p4.id}`)

    // 3. Interrogazione tabella players simulando il filtro registrationStatus === 'missing'
    // Condizione: is_active = true AND figc_registration IS NULL AND season_id = testSeasonId
    console.log('\n--- TEST 1: Verifica filtro (registrationStatus === missing) ---')
    const { data: filteredPlayers, error: filterErr } = await admin.from('players')
      .select('*')
      .eq('season_id', seasonId)
      .eq('is_active', true)
      .is('figc_registration', null)

    if (filterErr) throw new Error(`Errore durante l'interrogazione del filtro: ${filterErr.message}`)

    const returnedIds = filteredPlayers.map(p => p.id)
    console.log(`Atleti trovati dal filtro: ${returnedIds.length}`)
    if (returnedIds.length === 1 && returnedIds.includes(p1.id)) {
      console.log('✅ TEST SUPERATO: Solo Player 1 è stato restituito dal filtro.')
    } else {
      console.error(`❌ TEST FALLITO: Risultati del filtro errati. Atteso solo [${p1.id}], ottenuto:`, returnedIds)
      failures++
    }

    // 4. Interrogazione tabella players simulando il conteggio matricole mancanti per la stagione di test
    console.log('\n--- TEST 2: Verifica query di conteggio ---')
    const { count, error: countErr } = await admin.from('players')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('is_active', true)
      .is('figc_registration', null)

    if (countErr) throw new Error(`Errore durante la query di conteggio: ${countErr.message}`)

    console.log(`Conteggio restituito: ${count}`)
    if (count === 1) {
      console.log('✅ TEST SUPERATO: Il conteggio iniziale delle matricole mancanti è pari a 1.')
    } else {
      console.error(`❌ TEST FALLITO: Il conteggio atteso era 1, ottenuto: ${count}`)
      failures++
    }

    // 5. Aggiornamento Player 1 impostando figc_registration = '54321' e verifica azzeramento
    console.log('\n--- TEST 3: Aggiornamento matricola e verifica azzeramento del conteggio ---')
    const { error: updateErr } = await admin.from('players')
      .update({ figc_registration: '54321' })
      .eq('id', p1.id)

    if (updateErr) throw new Error(`Errore durante l'aggiornamento di Player 1: ${updateErr.message}`)
    console.log('Player 1 aggiornato con matricola "54321".')

    const { count: countAfterUpdate, error: count2Err } = await admin.from('players')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('is_active', true)
      .is('figc_registration', null)

    if (count2Err) throw new Error(`Errore durante la seconda query di conteggio: ${count2Err.message}`)

    console.log(`Conteggio dopo aggiornamento: ${countAfterUpdate}`)
    if (countAfterUpdate === 0) {
      console.log('✅ TEST SUPERATO: Il conteggio dopo l\'aggiornamento è sceso a 0.')
    } else {
      console.error(`❌ TEST FALLITO: Il conteggio atteso dopo l'aggiornamento era 0, ottenuto: ${countAfterUpdate}`)
      failures++
    }

  } catch (err) {
    console.error('❌ Errore inaspettato durante il test:', err.message)
    failures++
  } finally {
    // 6. Pulizia di tutti gli atleti e le stagioni creati per lasciare il DB pulito
    console.log('\n--- Pulizia dei dati di test dal database ---')
    try {
      const { error: cleanPlayersErr } = await admin.from('players')
        .delete()
        .like('first_name', 'TEST_REG_%')
      if (cleanPlayersErr) {
        console.error('Errore durante la rimozione dei giocatori di test:', cleanPlayersErr.message)
      } else {
        console.log('Giocatori di test rimossi con successo.')
      }

      if (seasonId) {
        const { error: cleanSeasonErr } = await admin.from('seasons')
          .delete()
          .eq('id', seasonId)
        if (cleanSeasonErr) {
          console.error('Errore durante la rimozione della stagione TEST_REG_SEASON:', cleanSeasonErr.message)
        } else {
          console.log('Stagione TEST_REG_SEASON rimossa con successo.')
        }
      }

      if (otherSeasonId) {
        const { error: cleanOtherSeasonErr } = await admin.from('seasons')
          .delete()
          .eq('id', otherSeasonId)
        if (cleanOtherSeasonErr) {
          console.error('Errore durante la rimozione della stagione TEST_REG_SEASON_OTHER:', cleanOtherSeasonErr.message)
        } else {
          console.log('Stagione TEST_REG_SEASON_OTHER rimossa con successo.')
        }
      }
    } catch (cleanupErr) {
      console.error('Errore critico durante la fase di pulizia:', cleanupErr.message)
    }
  }

  // 7. Esito finale e codice di uscita coerente
  console.log(`\n=== ESITO DEI TEST DI REGISTRAZIONE ===`)
  if (failures === 0) {
    console.log('🟢 Tutti i test di integrazione per la matricola mancante sono SUPERATI!')
    process.exit(0)
  } else {
    console.error(`🔴 Ci sono stati ${failures} fallimenti.`)
    process.exit(1)
  }
}

runTests().catch(console.error)
