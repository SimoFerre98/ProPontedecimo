// Integration test for Attendance (US-017).
// Esecuzione:  node scripts/test-attendance.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `Attendance!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-att-${role}@propontedecimo.test`

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

const ctx = {
  users: {},
  seasons: {},
  players: {},
  coachTeams: []
}

async function cleanup() {
  console.log('Cleaning up test data...')
  
  // Rimuovi presenze
  if (Object.values(ctx.players).length > 0) {
    await admin.from('attendance').delete().in('player_id', Object.values(ctx.players))
  }
  
  // Rimuovi associazioni coach-team
  if (Object.values(ctx.users).length > 0) {
    await admin.from('coach_teams').delete().in('profile_id', Object.values(ctx.users))
  }

  // Rimuovi giocatori
  await admin.from('players').delete().like('first_name', 'TEST_ATT_%')

  // Rimuovi profili e utenti auth
  for (const role of Object.keys(ctx.users)) {
    const id = ctx.users[role]
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
  }

  // Rimuovi stagioni
  for (const key of Object.keys(ctx.seasons)) {
    await admin.from('seasons').delete().eq('id', ctx.seasons[key])
  }
  console.log('Cleanup finished.')
}

async function setup() {
  console.log('Setting up test database state...')
  
  // 1. Crea 2 stagioni
  const { data: s1, error: es1 } = await admin.from('seasons').insert({
    name: 'TEST_ATT_SEASON_1', start_date: '2026-07-01', end_date: '2027-06-30', is_active: true
  }).select('id').single()
  if (es1) throw es1
  ctx.seasons.s1 = s1.id

  const { data: s2, error: es2 } = await admin.from('seasons').insert({
    name: 'TEST_ATT_SEASON_2', start_date: '2027-07-01', end_date: '2028-06-30', is_active: false
  }).select('id').single()
  if (es2) throw es2
  ctx.seasons.s2 = s2.id

  // 2. Crea 2 coach (A e B)
  const roles = ['coach_a', 'coach_b']
  for (const role of roles) {
    const email = emailFor(role)
    const { data, error } = await admin.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true
    })
    if (error) throw error
    ctx.users[role] = data.user.id
    
    const { error: ep } = await admin.from('profiles').upsert({
      id: data.user.id, email, full_name: `TEST_ATT_${role.toUpperCase()}`, role: 'coach'
    })
    if (ep) throw ep
  }

  // 3. Associa coach ai settori (Leva A e Leva B)
  const { error: ect1 } = await admin.from('coach_teams').insert({
    profile_id: ctx.users.coach_a, team_sector: 'LEVA_A'
  })
  if (ect1) throw ect1

  const { error: ect2 } = await admin.from('coach_teams').insert({
    profile_id: ctx.users.coach_b, team_sector: 'LEVA_B'
  })
  if (ect2) throw ect2

  // 4. Crea giocatori (Player A in Leva A Stagione 1, Player B in Leva B Stagione 1, Player C in Leva A Stagione 2)
  const mkPlayer = (first, last, sector, seasonId) => ({
    first_name: 'TEST_ATT_' + first,
    last_name: last,
    team_sector: sector,
    season_id: seasonId,
    is_active: true,
    birth_date: '1990-01-01',
    birth_place: 'Genova',
    citizenship: 'Italiana',
    address_street: 'Via Test',
    address_city: 'Genova',
    address_zip: '16100',
    email: `${last.toLowerCase()}@test.it`,
    phone_player: '3331122333',
    privacy_accepted: true,
    tax_code: `RSSMRA90A01D969${last}`
  })

  const { data: pA, error: epA } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'A', 'LEVA_A', ctx.seasons.s1)
  ).select('id').single()
  if (epA) throw epA
  ctx.players.a = pA.id

  const { data: pB, error: epB } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'B', 'LEVA_B', ctx.seasons.s1)
  ).select('id').single()
  if (epB) throw epB
  ctx.players.b = pB.id

  const { data: pC, error: epC } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'C', 'LEVA_A', ctx.seasons.s2)
  ).select('id').single()
  if (epC) throw epC
  ctx.players.c = pC.id

  console.log('Setup finished.')
}

async function runTests() {
  console.log('Running attendance tests...')

  // Test 1: Coach A vede solo Player A (della propria leva) in Stagione 1
  {
    const clientA = await loginAs('coach_a')
    const { data: roster, error } = await clientA
      .from('players')
      .select('id, last_name, team_sector')
      .eq('season_id', ctx.seasons.s1)
      .eq('is_active', true)
      .like('first_name', 'TEST_ATT_%')

    check('Roster - Coach A vede solo atleti della propria leva (Leva A)', 
      !error && roster.length === 1 && roster[0].id === ctx.players.a,
      error ? error.message : `visti: ${roster.map(r => r.last_name).join(', ')}`
    )
  }

  // Test 2: Coach A non vede Player C (Stagione 2) quando query è limitata alla Stagione 1
  {
    const clientA = await loginAs('coach_a')
    const { data: roster, error } = await clientA
      .from('players')
      .select('id, last_name, team_sector')
      .eq('season_id', ctx.seasons.s2)
      .eq('is_active', true)
      .like('first_name', 'TEST_ATT_%')

    check('Stagione - Coach A vede gli atleti della Stagione 2 solo se richiesto', 
      !error && roster.length === 1 && roster[0].id === ctx.players.c,
      error ? error.message : `visti: ${roster.map(r => r.last_name).join(', ')}`
    )
  }

  // Test 3: Coach A registra presenza per la propria leva (Player A)
  {
    const clientA = await loginAs('coach_a')
    const { data, error } = await clientA
      .from('attendance')
      .insert({
        player_id: ctx.players.a,
        session_date: '2026-07-10',
        status: 'present',
        created_by: ctx.users.coach_a,
        type: 'training'
      })
      .select()

    check('RLS - Coach A può inserire presenza per atleta propria leva', !error && data?.length === 1, error?.message)
  }

  // Test 4: Coach A NON può registrare presenza per atleta di un'altra leva (Player B)
  {
    const clientA = await loginAs('coach_a')
    const { error } = await clientA
      .from('attendance')
      .insert({
        player_id: ctx.players.b,
        session_date: '2026-07-10',
        status: 'present',
        created_by: ctx.users.coach_a,
        type: 'training'
      })

    check('RLS - Coach A NON può inserire presenze per atleti di altre leve', !!error, error ? 'bloccato correttamente' : 'inserito fuori leva!')
  }

  // Test 5: Upsert/Modifica presenza (idempotenza e vincolo di unicità)
  {
    const clientA = await loginAs('coach_a')
    // Upsert a 'absent'
    const { error: err1 } = await clientA
      .from('attendance')
      .upsert({
        player_id: ctx.players.a,
        session_date: '2026-07-10',
        status: 'absent',
        created_by: ctx.users.coach_a,
        type: 'training'
      }, { onConflict: 'player_id,session_date,type' })

    check('Modificabilità - Coach A esegue upsert per cambiare stato in absent', !err1, err1?.message)

    // Upsert a 'justified'
    const { error: err2 } = await clientA
      .from('attendance')
      .upsert({
        player_id: ctx.players.a,
        session_date: '2026-07-10',
        status: 'justified',
        created_by: ctx.users.coach_a,
        type: 'training'
      }, { onConflict: 'player_id,session_date,type' })

    check('Modificabilità - Coach A esegue upsert per cambiare stato in justified', !err2, err2?.message)

    // Verifica che ci sia solo 1 riga per Player A su quella data ed è justified
    const { data: rows, error: errQuery } = await clientA
      .from('attendance')
      .select('*')
      .eq('player_id', ctx.players.a)
      .eq('session_date', '2026-07-10')

    check('Unicità - Esiste solo un record per la terna (player, date, type)', 
      !errQuery && rows?.length === 1 && rows[0].status === 'justified',
      errQuery ? errQuery.message : `righe trovate: ${rows?.length}, stato: ${rows?.[0]?.status}`
    )
  }
}

try {
  await cleanup() // pulizia preliminare
  await setup()
  await runTests()
} catch (e) {
  failures++
  results.push(`❌ ERRORE FATALE: ${e.message}`)
  console.error(e)
} finally {
  await cleanup()
}

console.log('\n=== RISULTATI TEST REGISTRO PRESENZE ===')
for (const r of results) console.log(r)
console.log(`\n${failures === 0 ? '🟢 Tutti i test del registro presenze sono SUPERATI!' : `🔴 ${failures} controlli falliti`}`)
process.exit(failures === 0 ? 0 : 1)
