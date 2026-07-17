// Integration test per Gestione convocazioni (US-032).
// Verifica le RLS sulla tabella call_ups e sulle nuove colonne di events
// (opponent, team_sector, call_up_published_at) contro Supabase LOCALE.
//
// Esecuzione:  node scripts/test-call-ups.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

// --- Gira sempre contro lo stack Supabase locale (vedi CLAUDE.md) ---
const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `CallUps!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-cu-${role}@propontedecimo.test`
const LEVA_A = 'TEST_CU_LEVA_A'
const LEVA_B = 'TEST_CU_LEVA_B'

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
  events: {},
  callUps: {},
}

// Rimuove residui di run precedenti fallite (stesso motivo di test-rls.mjs:
// senza, createUser fallisce con "already registered" e lo script si blocca).
async function precleanup() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const staleIds = []
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-cu-') && u.email?.endsWith('@propontedecimo.test')) {
      staleIds.push(u.id)
    }
  }
  if (staleIds.length > 0) {
    await admin.from('coach_teams').delete().in('profile_id', staleIds)
    await admin.from('profiles').delete().in('id', staleIds)
    for (const id of staleIds) {
      await admin.auth.admin.deleteUser(id)
    }
  }

  const { data: staleEvents } = await admin.from('events').select('id').like('title', 'TEST_CU_%')
  if (staleEvents?.length) {
    const eventIds = staleEvents.map((e) => e.id)
    await admin.from('call_ups').delete().in('event_id', eventIds)
    await admin.from('events').delete().in('id', eventIds)
  }

  const { data: stalePlayers } = await admin.from('players').select('id').like('first_name', 'TEST_CU_%')
  if (stalePlayers?.length) {
    const playerIds = stalePlayers.map((p) => p.id)
    await admin.from('call_ups').delete().in('player_id', playerIds)
    await admin.from('players').delete().in('id', playerIds)
  }

  await admin.from('seasons').delete().like('name', 'TEST_CU_%')
}

async function cleanup() {
  console.log('Cleaning up test data...')

  // Convocazioni
  const eventIds = Object.values(ctx.events)
  const playerIds = Object.values(ctx.players)
  if (eventIds.length > 0) {
    await admin.from('call_ups').delete().in('event_id', eventIds)
  }
  if (playerIds.length > 0) {
    await admin.from('call_ups').delete().in('player_id', playerIds)
  }

  // Eventi
  if (eventIds.length > 0) {
    await admin.from('events').delete().in('id', eventIds)
  }

  // Associazioni coach-team
  if (Object.values(ctx.users).length > 0) {
    await admin.from('coach_teams').delete().in('profile_id', Object.values(ctx.users))
  }

  // Giocatori
  await admin.from('players').delete().like('first_name', 'TEST_CU_%')

  // Profili e utenti auth
  for (const role of Object.keys(ctx.users)) {
    const id = ctx.users[role]
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
  }

  // Stagioni
  for (const key of Object.keys(ctx.seasons)) {
    await admin.from('seasons').delete().eq('id', ctx.seasons[key])
  }
  console.log('Cleanup finished.')
}

async function setup() {
  console.log('Setting up test database state...')

  // 1. Stagione di test
  const { data: season, error: es } = await admin.from('seasons').insert({
    name: 'TEST_CU_SEASON', start_date: '2026-07-01', end_date: '2027-06-30', is_active: false,
  }).select('id').single()
  if (es) throw es
  ctx.seasons.s1 = season.id

  // 2. Utenti: un coach (assegnato solo a LEVA_A), un president, un player (A1, con login reale)
  const { data: coachUser, error: ecoach } = await admin.auth.admin.createUser({
    email: emailFor('coach'), password: PASSWORD, email_confirm: true,
  })
  if (ecoach) throw ecoach
  ctx.users.coach = coachUser.user.id
  const { error: epc } = await admin.from('profiles').upsert({
    id: ctx.users.coach, email: emailFor('coach'), full_name: 'TEST_CU_COACH', role: 'coach',
  })
  if (epc) throw epc

  const { data: presUser, error: epres } = await admin.auth.admin.createUser({
    email: emailFor('president'), password: PASSWORD, email_confirm: true,
  })
  if (epres) throw epres
  ctx.users.president = presUser.user.id
  const { error: epp } = await admin.from('profiles').upsert({
    id: ctx.users.president, email: emailFor('president'), full_name: 'TEST_CU_PRESIDENT', role: 'president',
  })
  if (epp) throw epp

  const { data: playerA1User, error: ea1 } = await admin.auth.admin.createUser({
    email: emailFor('player_a1'), password: PASSWORD, email_confirm: true,
  })
  if (ea1) throw ea1
  ctx.users.player_a1 = playerA1User.user.id
  const { error: epa1 } = await admin.from('profiles').upsert({
    id: ctx.users.player_a1, email: emailFor('player_a1'), full_name: 'TEST_CU_PLAYER_A1', role: 'player',
  })
  if (epa1) throw epa1

  // 3. Il coach segue solo LEVA_A
  const { error: ect } = await admin.from('coach_teams').insert({
    profile_id: ctx.users.coach, team_sector: LEVA_A,
  })
  if (ect) throw ect

  // 4. Giocatori: A1 (con profilo/login), A2 (solo anagrafica) in LEVA_A; B1 in LEVA_B
  const mkPlayer = (first, last, sector, taxSuffix, profile_id = null) => ({
    first_name: 'TEST_CU_' + first,
    last_name: last,
    team_sector: sector,
    season_id: ctx.seasons.s1,
    is_active: true,
    profile_id,
    birth_date: '1990-01-01',
    birth_place: 'Genova',
    citizenship: 'Italiana',
    address_street: 'Via Test',
    address_city: 'Genova',
    address_zip: '16100',
    email: `cu.${last.toLowerCase()}@test.it`,
    phone_player: '3331122333',
    privacy_accepted: true,
    tax_code: `RSSMRA90A01D969${taxSuffix}`,
  })

  const { data: pA1, error: epA1 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'A1', LEVA_A, 'X', ctx.users.player_a1)
  ).select('id').single()
  if (epA1) throw epA1
  ctx.players.a1 = pA1.id

  const { data: pA2, error: epA2 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'A2', LEVA_A, 'Y')
  ).select('id').single()
  if (epA2) throw epA2
  ctx.players.a2 = pA2.id

  const { data: pB1, error: epB1 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'B1', LEVA_B, 'Z')
  ).select('id').single()
  if (epB1) throw epB1
  ctx.players.b1 = pB1.id

  // 5. Due eventi 'home_match' in LEVA_A: uno futuro (ritrovo non ancora passato),
  //    uno passato (ritrovo già trascorso). Inseriti come admin: la RLS su events
  //    richiede comunque un ruolo staff, qui bypassata dal service_role.
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: evUpcoming, error: eeu } = await admin.from('events').insert({
    title: 'TEST_CU_MATCH_UPCOMING',
    event_type: 'home_match',
    start_date: future,
    meetup_time: future,
    opponent: 'TEST_CU_OPPONENT',
    team_sector: LEVA_A,
    created_by: ctx.users.president,
  }).select('id').single()
  if (eeu) throw eeu
  ctx.events.upcoming = evUpcoming.id

  const { data: evPast, error: eep } = await admin.from('events').insert({
    title: 'TEST_CU_MATCH_PAST',
    event_type: 'home_match',
    start_date: past,
    meetup_time: past,
    opponent: 'TEST_CU_OPPONENT',
    team_sector: LEVA_A,
    created_by: ctx.users.president,
  }).select('id').single()
  if (eep) throw eep
  ctx.events.past = evPast.id

  console.log('Setup finished.')
}

async function runTests() {
  console.log('Running call-ups tests...')

  const clientCoach = await loginAs('coach')

  // Test 1: Coach convoca A1 (propria leva) sull'evento futuro -> riuscito
  {
    const { data, error } = await clientCoach.from('call_ups').insert({
      event_id: ctx.events.upcoming, player_id: ctx.players.a1, created_by: ctx.users.coach,
    }).select()
    check('Coach convoca A1 (propria leva) su evento futuro', !error && data?.length === 1, error?.message)
    if (data?.length === 1) ctx.callUps.a1Upcoming = data[0].id
  }

  // Test 2: Coach tenta di convocare B1 (altra leva) sull'evento futuro -> bloccato
  {
    const { error } = await clientCoach.from('call_ups').insert({
      event_id: ctx.events.upcoming, player_id: ctx.players.b1, created_by: ctx.users.coach,
    })
    check('Coach NON può convocare atleta di un\'altra leva', !!error, error ? 'bloccato correttamente' : 'CONVOCAZIONE FUORI LEVA RIUSCITA!')
  }

  // Test 3a: Coach tenta INSERT su evento passato (A2, propria leva) -> bloccato
  {
    const { error } = await clientCoach.from('call_ups').insert({
      event_id: ctx.events.past, player_id: ctx.players.a2, created_by: ctx.users.coach,
    })
    check('Coach NON può convocare su evento con ritrovo già passato (insert)', !!error, error ? 'bloccato correttamente' : 'INSERITO SU EVENTO PASSATO!')
  }

  // Test 3b: Coach tenta DELETE su una convocazione di un evento passato -> bloccato
  //   (riga pre-esistente inserita dall'admin per avere qualcosa da cancellare)
  {
    const { data: seedRow, error: eSeed } = await admin.from('call_ups').insert({
      event_id: ctx.events.past, player_id: ctx.players.a2, created_by: ctx.users.coach,
    }).select('id').single()
    if (eSeed) throw eSeed
    ctx.callUps.a2Past = seedRow.id

    await clientCoach.from('call_ups').delete().eq('id', ctx.callUps.a2Past)
    const { data: stillThere, error: eCheck } = await admin.from('call_ups').select('id').eq('id', ctx.callUps.a2Past)
    const blocked = !eCheck && stillThere?.length === 1
    check('Coach NON può cancellare una convocazione su evento passato (delete)', blocked, eCheck ? eCheck.message : (blocked ? 'bloccato correttamente' : 'CANCELLAZIONE RIUSCITA!'))
  }

  // Test 4: Player A1 (prima della pubblicazione) non vede la propria convocazione
  const clientA1 = await loginAs('player_a1')
  {
    const { data, error } = await clientA1.from('call_ups').select('*').eq('event_id', ctx.events.upcoming)
    check('Player A1 non vede la convocazione prima della pubblicazione', !error && (data?.length ?? 0) === 0, error ? error.message : `visti: ${data?.length}`)
  }

  // Seed: l'admin convoca anche A2 sullo stesso evento futuro, per verificare
  // in seguito che A1 non veda mai la riga di un altro atleta.
  {
    const { error: eSeed2 } = await admin.from('call_ups').insert({
      event_id: ctx.events.upcoming, player_id: ctx.players.a2, created_by: ctx.users.coach,
    })
    if (eSeed2) throw eSeed2
  }

  // Test 5: Admin pubblica l'evento futuro -> Player A1 vede ora la propria riga
  {
    const { error: ePub } = await admin.from('events').update({
      call_up_published_at: new Date().toISOString(),
    }).eq('id', ctx.events.upcoming)
    check('Admin pubblica la convocazione (call_up_published_at valorizzato)', !ePub, ePub?.message)

    const { data, error } = await clientA1.from('call_ups').select('*').eq('event_id', ctx.events.upcoming)
    check('Player A1 vede la propria convocazione dopo la pubblicazione', !error && data?.length === 1 && data[0].player_id === ctx.players.a1, error ? error.message : `righe viste: ${data?.length}`)
  }

  // Test 6: Player A1 non vede MAI la convocazione di un altro atleta (A2), anche pubblicata
  {
    const { data, error } = await clientA1.from('call_ups').select('*').eq('event_id', ctx.events.upcoming)
    const onlyOwnRows = !error && (data ?? []).every((r) => r.player_id === ctx.players.a1)
    check('Player A1 non vede mai righe di convocazione di altri atleti', onlyOwnRows, error ? error.message : `player_id visti: ${(data ?? []).map((r) => r.player_id).join(', ')}`)
  }

  // Test 6b: Admin ritira la pubblicazione (AC5) -> Player A1 torna a non vedere la riga,
  //   pur restando convocato (la riga call_ups non viene toccata dal ritiro)
  {
    const { error: eUnpub } = await admin.from('events').update({
      call_up_published_at: null,
    }).eq('id', ctx.events.upcoming)
    check('Admin ritira la pubblicazione (call_up_published_at azzerato)', !eUnpub, eUnpub?.message)

    const { data, error } = await clientA1.from('call_ups').select('*').eq('event_id', ctx.events.upcoming)
    check('Player A1 non vede più la convocazione dopo il ritiro della pubblicazione', !error && (data?.length ?? 0) === 0, error ? error.message : `visti: ${data?.length}`)

    const { data: stillCalledUp, error: eCheck } = await admin.from('call_ups').select('id').eq('event_id', ctx.events.upcoming).eq('player_id', ctx.players.a1)
    check('La riga di A1 resta convocata dopo il ritiro (il ritiro nasconde, non cancella)', !eCheck && stillCalledUp?.length === 1, eCheck?.message)
  }

  // Test 7: President convoca/cancella senza restrizioni (altra leva + evento passato)
  const clientPresident = await loginAs('president')
  {
    const { data, error } = await clientPresident.from('call_ups').insert({
      event_id: ctx.events.past, player_id: ctx.players.b1, created_by: ctx.users.president,
    }).select()
    check('President convoca qualunque atleta (altra leva) su evento passato', !error && data?.length === 1, error?.message)

    if (data?.length === 1) {
      const { error: eDel } = await clientPresident.from('call_ups').delete().eq('id', data[0].id)
      check('President cancella una convocazione su evento passato', !eDel, eDel?.message)
    }
  }
}

try {
  console.log('Pre-cleanup residui di run precedenti...')
  await precleanup()
  await setup()
  await runTests()
} catch (e) {
  failures++
  results.push(`❌ ERRORE FATALE: ${e.message}`)
  console.error(e)
} finally {
  try {
    await cleanup()
  } catch (e) {
    console.error('Cleanup incompleto:', e.message)
  }
}

console.log('\n=== RISULTATI TEST GESTIONE CONVOCAZIONI ===')
for (const r of results) console.log(r)
console.log(`\n${failures === 0 ? '🟢 Tutti i test delle convocazioni sono SUPERATI!' : `🔴 ${failures} controlli falliti`}`)
process.exit(failures === 0 ? 0 : 1)
