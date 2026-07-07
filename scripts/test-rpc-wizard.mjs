// Integration test for create_season_from_wizard RPC.
// Esecuzione:  node scripts/test-rpc-wizard.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `Wizard!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-wizard-${role}@propontedecimo.test`

const results = []
let failures = 0
function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function loginAs(role) {
  const client = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email: emailFor(role), password: PASSWORD })
  if (error) throw new Error(`login ${role}: ${error.message}`)
  return client
}

const ctx = { users: {}, players: [] }

async function cleanup() {
  console.log('Cleaning up test data...')
  
  // Rimuovi giocatori di test
  await admin.from('players').delete().like('first_name', 'TEST_WIZARD%')

  // Rimuovi stagioni di test
  await admin.from('seasons').delete().like('name', 'TEST_WIZARD%')

  // Ripristina una stagione attiva di default (se non ce n'è una attiva)
  const { data: activeSeasons } = await admin.from('seasons').select('id').eq('is_active', true)
  if (!activeSeasons?.length) {
    const { data: anySeason } = await admin.from('seasons').select('id').limit(1)
    if (anySeason?.length) {
      await admin.from('seasons').update({ is_active: true }).eq('id', anySeason[0].id)
    }
  }

  // Rimuovi utenti di test
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-wizard-') && u.email?.endsWith('@propontedecimo.test')) {
      await admin.from('profiles').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  }
}

async function setup() {
  console.log('Setting up test users and profiles...')
  
  // 1. Create president user
  const { data: presData, error: presErr } = await admin.auth.admin.createUser({
    email: emailFor('president'), password: PASSWORD, email_confirm: true
  })
  if (presErr) throw new Error(`create president: ${presErr.message}`)
  ctx.users.president = presData.user.id
  
  let { error: pProfileErr } = await admin.from('profiles').upsert({
    id: presData.user.id, email: emailFor('president'), full_name: 'TEST_WIZARD_President', role: 'president'
  })
  if (pProfileErr) throw new Error(`president profile: ${pProfileErr.message}`)

  // 2. Create coach user (unauthorized role)
  const { data: coachData, error: coachErr } = await admin.auth.admin.createUser({
    email: emailFor('coach'), password: PASSWORD, email_confirm: true
  })
  if (coachErr) throw new Error(`create coach: ${coachErr.message}`)
  ctx.users.coach = coachData.user.id

  let { error: cProfileErr } = await admin.from('profiles').upsert({
    id: coachData.user.id, email: emailFor('coach'), full_name: 'TEST_WIZARD_Coach', role: 'coach'
  })
  if (cProfileErr) throw new Error(`coach profile: ${cProfileErr.message}`)

  // 3. Create test source season
  console.log('Setting up test season and players...')
  // Deattiva stagioni esistenti temporaneamente per non violare l'indice parziale
  await admin.from('seasons').update({ is_active: false }).eq('is_active', true)

  const { data: season, error: se } = await admin.from('seasons').insert({
    name: 'TEST_WIZARD_2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', is_active: true
  }).select('id').single()
  if (se) throw new Error(`create source season: ${se.message}`)
  ctx.sourceSeasonId = season.id

  // 4. Create source players
  // NB: dal introduzione di US-009 (trg_validate_player_fields) un insert diretto sui
  // giocatori deve soddisfare tutti i campi obbligatori: qui i giocatori sono minorenni,
  // quindi serve anche almeno un genitore con nome e telefono.
  const baseFields = {
    birth_place: 'Genova', citizenship: 'Italiana',
    address_street: 'Via Test 1', address_city: 'Genova', address_zip: '16100',
    email: 'test.wizard@example.com', phone_player: '3331112222',
    privacy_accepted: true,
    parent1_name: 'Genitore Test', parent1_phone: '3339998888'
  }
  const { data: players, error: pe } = await admin.from('players').insert([
    { ...baseFields, first_name: 'TEST_WIZARD_A', last_name: 'Player1', team_sector: 'Pulcini 2016', season_id: ctx.sourceSeasonId, birth_date: '2016-05-15', is_active: true, medical_expiry: '2027-01-10', figc_registration: 'FIGC123', is_registered: true, tax_code: 'PLYAAA16E15D969A' },
    { ...baseFields, first_name: 'TEST_WIZARD_B', last_name: 'Player2', team_sector: 'Pulcini 2015', season_id: ctx.sourceSeasonId, birth_date: '2015-08-20', is_active: true, is_registered: false, tax_code: 'PLYBBB15M20D969B' },
    { ...baseFields, first_name: 'TEST_WIZARD_C', last_name: 'Player3', team_sector: 'Pulcini 2015', season_id: ctx.sourceSeasonId, birth_date: '2015-01-01', is_active: true, is_registered: true, tax_code: 'PLYCCC15A01D969C' }
  ]).select('id, first_name').order('first_name')
  if (pe) throw new Error(`create players: ${pe.message}`)
  ctx.players = players
}

async function runTests() {
  await cleanup()
  await setup()

  console.log('Running tests...')

  // CASE 1: Authorization Failure (Coach cannot invoke the RPC)
  try {
    const coachClient = await loginAs('coach')
    const { data, error } = await coachClient.rpc('create_season_from_wizard', {
      p_name: 'TEST_WIZARD_2026/2027_FAIL_AUTH',
      p_start_date: '2026-07-01',
      p_end_date: '2027-06-30',
      p_players: []
    })
    check('Authorization - Coach cannot create season', !!error, 'Expected error for unauthorized role')
  } catch (err) {
    check('Authorization - Coach error catch', false, err.message)
  }

  // CASE 2: Rollback on error (AC5 - partial wizard creation leaves no data)
  try {
    const presClient = await loginAs('president')
    
    // We send a duplicate season name to trigger duplicate key constraint on seasons_name_key
    const { data, error } = await presClient.rpc('create_season_from_wizard', {
      p_name: 'TEST_WIZARD_2025/2026', // Duplicate name!
      p_start_date: '2026-07-01',
      p_end_date: '2027-06-30',
      p_players: [
        { player_id: ctx.players[0].id, team_sector: 'Pulcini 2016' }
      ]
    })

    check('Rollback - call failed as expected', !!error, error?.message)
    
    // Verify that the player was NOT inserted for a new season
    // Since the transaction rolled back, the player should not exist in any other season than sourceSeasonId
    const { data: playerAInstances } = await admin.from('players').select('id').eq('first_name', 'TEST_WIZARD_A')
    check('Rollback - Player was not copied due to transaction rollback', playerAInstances?.length === 1)
    
    // Verify that the source season is still active
    const { data: sourceSeason } = await admin.from('seasons').select('is_active').eq('id', ctx.sourceSeasonId).single()
    check('Rollback - Source season remains active', sourceSeason && sourceSeason.is_active === true)
  } catch (err) {
    check('Rollback - unexpected catch', false, err.message)
  }

  // CASE 2b: Rollback on non-existent player_id (AC5 - no silent partial import)
  try {
    const presClient = await loginAs('president')
    const fakePlayerId = '00000000-0000-0000-0000-000000000000'

    const { data, error } = await presClient.rpc('create_season_from_wizard', {
      p_name: 'TEST_WIZARD_2026/2027_FAIL_MISSING_PLAYER',
      p_start_date: '2026-07-01',
      p_end_date: '2027-06-30',
      p_players: [
        { player_id: ctx.players[0].id, team_sector: 'Pulcini 2016' },
        { player_id: fakePlayerId, team_sector: 'Pulcini 2016' }
      ]
    })

    check('Rollback (missing player) - call failed as expected', !!error, error?.message)

    const { data: seasonRow } = await admin.from('seasons').select('id').eq('name', 'TEST_WIZARD_2026/2027_FAIL_MISSING_PLAYER')
    check('Rollback (missing player) - season was not created', !seasonRow || seasonRow.length === 0)

    const { data: playerAInstances } = await admin.from('players').select('id').eq('first_name', 'TEST_WIZARD_A')
    check('Rollback (missing player) - player was not copied', playerAInstances?.length === 1)
  } catch (err) {
    check('Rollback (missing player) - unexpected catch', false, err.message)
  }

  // CASE 3: Happy Path & Duplicate elimination
  try {
    const presClient = await loginAs('president')
    
    // We send player A, B, C. And we send player A twice to test duplicate elimination.
    const { data: rpcRes, error: rpcErr } = await presClient.rpc('create_season_from_wizard', {
      p_name: 'TEST_WIZARD_2026/2027',
      p_start_date: '2026-07-01',
      p_end_date: '2027-06-30',
      p_players: [
        { player_id: ctx.players[0].id, team_sector: 'Pulcini 2016' },
        { player_id: ctx.players[1].id, team_sector: 'Esordienti 2015' },
        { player_id: ctx.players[2].id, team_sector: 'Pulcini 2015' },
        { player_id: ctx.players[0].id, team_sector: 'Pulcini 2016' } // DUPLICATE ENTRY
      ]
    })

    if (rpcErr) throw new Error(rpcErr.message)

    check('Happy Path - RPC executed successfully', !!rpcRes)
    check('Happy Path - RPC imported count is 3 (duplicates deduped)', rpcRes.imported_count === 3)
    
    const newSeasonId = rpcRes.season_id

    // Check season status
    const { data: newSeason } = await admin.from('seasons').select('*').eq('id', newSeasonId).single()
    check('Happy Path - New season created and is_active is true', newSeason && newSeason.is_active === true)

    const { data: oldSeason } = await admin.from('seasons').select('*').eq('id', ctx.sourceSeasonId).single()
    check('Happy Path - Old season was deactivated', oldSeason && oldSeason.is_active === false)

    // Check copied players
    const { data: newPlayers, error: getNewPlayersErr } = await admin.from('players')
      .select('*')
      .eq('season_id', newSeasonId)
      .order('first_name')

    if (getNewPlayersErr) throw new Error(getNewPlayersErr.message)

    check('Happy Path - Exactly 3 players copied to new season', newPlayers.length === 3)

    // Player A
    const playerA = newPlayers[0]
    check('Player A - First name matches', playerA.first_name === 'TEST_WIZARD_A')
    check('Player A - Leva matches destination', playerA.team_sector === 'Pulcini 2016')
    check('Player A - is_registered reset to false', playerA.is_registered === false)
    check('Player A - is_active is true', playerA.is_active === true)
    check('Player A - medical_expiry preserved', playerA.medical_expiry === '2027-01-10')
    check('Player A - figc_registration preserved', playerA.figc_registration === 'FIGC123')

    // Player B
    const playerB = newPlayers[1]
    check('Player B - Leva matches target (scatto leva)', playerB.team_sector === 'Esordienti 2015')

    // Player C
    const playerC = newPlayers[2]
    check('Player C - Leva matches destination', playerC.team_sector === 'Pulcini 2015')

  } catch (err) {
    check('Happy Path - unexpected error', false, err.message)
  }

  // CASE 5: Bypass di trg_validate_player_fields (US-009) scoped alla sola transazione
  // della RPC — verifica che dopo la chiamata il bypass non resti attivo per la sessione,
  // così un insert diretto con dati incompleti continua a essere rifiutato normalmente.
  try {
    const { error: errIncomplete } = await admin.from('players').insert({
      season_id: ctx.sourceSeasonId,
      first_name: 'TEST_WIZARD_INCOMPLETE',
      last_name: 'Player'
      // Manca deliberatamente tutto il resto: deve fallire per trg_validate_player_fields.
    })
    check('Bypass scope - direct insert with incomplete data still rejected after RPC call', !!errIncomplete, errIncomplete?.message)
  } catch (err) {
    check('Bypass scope - unexpected catch', false, err.message)
  }

  // CASE 4: Duplicate Season Name Check
  try {
    const presClient = await loginAs('president')
    
    const { data, error } = await presClient.rpc('create_season_from_wizard', {
      p_name: 'TEST_WIZARD_2026/2027', // Duplicate name
      p_start_date: '2027-07-01',
      p_end_date: '2028-06-30',
      p_players: []
    })

    check('Validation - Duplicate season name fails', !!error, error?.message)
  } catch (err) {
    check('Validation - Duplicate season name unexpected error', false, err.message)
  }

  console.log('\n--- TEST RESULTS ---')
  results.forEach(r => console.log(r))

  await cleanup()

  if (failures > 0) {
    console.error(`\n❌ ${failures} test(s) failed!`)
    process.exit(1)
  } else {
    console.log('\n✅ All integration tests passed successfully!')
  }
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err)
  process.exit(1)
})
