// Integration test per Feed notifiche color-coded (US-034).
// Verifica le RLS sulla tabella announcements: scrittura riservata per leva
// al coach (mai team_sector NULL), scrittura libera per president/director,
// lettura scoping per coach/player/parent tramite get_my_announcement_sectors()
// e l'invariante status='confirmed' su parent_players (vedi CLAUDE.md).
//
// Esecuzione:  node scripts/test-announcements-rls.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

// --- Gira sempre contro lo stack Supabase locale (vedi CLAUDE.md) ---
const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `Announce!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-an-${role}@propontedecimo.test`
const LEVA_A = 'TEST_AN_LEVA_A'
const LEVA_B = 'TEST_AN_LEVA_B'

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
  announcements: {},
}

// Rimuove residui di run precedenti fallite (stesso motivo di test-call-ups.mjs:
// senza, createUser fallisce con "already registered" e lo script si blocca).
async function precleanup() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const staleIds = []
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-an-') && u.email?.endsWith('@propontedecimo.test')) {
      staleIds.push(u.id)
    }
  }
  if (staleIds.length > 0) {
    await admin.from('parent_players').delete().in('parent_profile_id', staleIds)
    await admin.from('coach_teams').delete().in('profile_id', staleIds)
    await admin.from('announcements').delete().in('created_by', staleIds)
    await admin.from('profiles').delete().in('id', staleIds)
    for (const id of staleIds) {
      await admin.auth.admin.deleteUser(id)
    }
  }

  const { data: staleAnnouncements } = await admin.from('announcements').select('id').like('title', 'TEST_AN_%')
  if (staleAnnouncements?.length) {
    await admin.from('announcements').delete().in('id', staleAnnouncements.map((a) => a.id))
  }

  const { data: stalePlayers } = await admin.from('players').select('id').like('first_name', 'TEST_AN_%')
  if (stalePlayers?.length) {
    const playerIds = stalePlayers.map((p) => p.id)
    await admin.from('parent_players').delete().in('player_id', playerIds)
    await admin.from('players').delete().in('id', playerIds)
  }

  await admin.from('seasons').delete().like('name', 'TEST_AN_%')
}

async function cleanup() {
  console.log('Cleaning up test data...')

  // Annunci
  const announcementIds = Object.values(ctx.announcements)
  if (announcementIds.length > 0) {
    await admin.from('announcements').delete().in('id', announcementIds)
  }
  await admin.from('announcements').delete().like('title', 'TEST_AN_%')

  // Associazioni parent-player
  if (Object.values(ctx.players).length > 0) {
    await admin.from('parent_players').delete().in('player_id', Object.values(ctx.players))
  }

  // Associazioni coach-team
  if (Object.values(ctx.users).length > 0) {
    await admin.from('coach_teams').delete().in('profile_id', Object.values(ctx.users))
  }

  // Giocatori
  await admin.from('players').delete().like('first_name', 'TEST_AN_%')

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
    name: 'TEST_AN_SEASON', start_date: '2026-07-01', end_date: '2027-06-30', is_active: false,
  }).select('id').single()
  if (es) throw es
  ctx.seasons.s1 = season.id

  // 2. Utenti: coach (assegnato solo a LEVA_A), president, player A1 (LEVA_A),
  //    player B1 (LEVA_B), parent (con figlio confirmed in LEVA_A e figlio pending in LEVA_B)
  const { data: coachUser, error: ecoach } = await admin.auth.admin.createUser({
    email: emailFor('coach'), password: PASSWORD, email_confirm: true,
  })
  if (ecoach) throw ecoach
  ctx.users.coach = coachUser.user.id
  const { error: epc } = await admin.from('profiles').upsert({
    id: ctx.users.coach, email: emailFor('coach'), full_name: 'TEST_AN_COACH', role: 'coach',
  })
  if (epc) throw epc

  const { data: presUser, error: epres } = await admin.auth.admin.createUser({
    email: emailFor('president'), password: PASSWORD, email_confirm: true,
  })
  if (epres) throw epres
  ctx.users.president = presUser.user.id
  const { error: epp } = await admin.from('profiles').upsert({
    id: ctx.users.president, email: emailFor('president'), full_name: 'TEST_AN_PRESIDENT', role: 'president',
  })
  if (epp) throw epp

  const { data: playerA1User, error: ea1 } = await admin.auth.admin.createUser({
    email: emailFor('player_a1'), password: PASSWORD, email_confirm: true,
  })
  if (ea1) throw ea1
  ctx.users.player_a1 = playerA1User.user.id
  const { error: epa1 } = await admin.from('profiles').upsert({
    id: ctx.users.player_a1, email: emailFor('player_a1'), full_name: 'TEST_AN_PLAYER_A1', role: 'player',
  })
  if (epa1) throw epa1

  const { data: playerB1User, error: eb1 } = await admin.auth.admin.createUser({
    email: emailFor('player_b1'), password: PASSWORD, email_confirm: true,
  })
  if (eb1) throw eb1
  ctx.users.player_b1 = playerB1User.user.id
  const { error: epb1 } = await admin.from('profiles').upsert({
    id: ctx.users.player_b1, email: emailFor('player_b1'), full_name: 'TEST_AN_PLAYER_B1', role: 'player',
  })
  if (epb1) throw epb1

  const { data: parentUser, error: eparent } = await admin.auth.admin.createUser({
    email: emailFor('parent'), password: PASSWORD, email_confirm: true,
  })
  if (eparent) throw eparent
  ctx.users.parent = parentUser.user.id
  const { error: eppar } = await admin.from('profiles').upsert({
    id: ctx.users.parent, email: emailFor('parent'), full_name: 'TEST_AN_PARENT', role: 'parent',
  })
  if (eppar) throw eppar

  // 3. Il coach segue solo LEVA_A
  const { error: ect } = await admin.from('coach_teams').insert({
    profile_id: ctx.users.coach, team_sector: LEVA_A,
  })
  if (ect) throw ect

  // 4. Giocatori: A1 (con profilo/login, LEVA_A), B1 (con profilo/login, LEVA_B),
  //    C1 (solo anagrafica, LEVA_B, figlio "pending" del genitore di test)
  const mkPlayer = (first, last, sector, taxSuffix, profile_id = null) => ({
    first_name: 'TEST_AN_' + first,
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
    email: `an.${last.toLowerCase()}@test.it`,
    phone_player: '3331122333',
    privacy_accepted: true,
    tax_code: `RSSMRA90A01D969${taxSuffix}`,
  })

  const { data: pA1, error: epA1 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'A1', LEVA_A, 'X', ctx.users.player_a1)
  ).select('id').single()
  if (epA1) throw epA1
  ctx.players.a1 = pA1.id

  const { data: pB1, error: epB1 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'B1', LEVA_B, 'Y', ctx.users.player_b1)
  ).select('id').single()
  if (epB1) throw epB1
  ctx.players.b1 = pB1.id

  const { data: pC1, error: epC1 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'C1', LEVA_B, 'Z')
  ).select('id').single()
  if (epC1) throw epC1
  ctx.players.c1 = pC1.id

  // 5. Il genitore di test ha un figlio confermato in LEVA_A (A1) e un figlio
  //    pending in LEVA_B (C1) — verifica l'invariante status='confirmed'.
  const { error: eppA1 } = await admin.from('parent_players').insert({
    parent_profile_id: ctx.users.parent, player_id: ctx.players.a1, status: 'confirmed',
  })
  if (eppA1) throw eppA1

  const { error: eppC1 } = await admin.from('parent_players').insert({
    parent_profile_id: ctx.users.parent, player_id: ctx.players.c1, status: 'pending',
  })
  if (eppC1) throw eppC1

  console.log('Setup finished.')
}

async function runTests() {
  console.log('Running announcements tests...')

  const clientCoach = await loginAs('coach')

  // Test 1: Coach inserisce un annuncio sulla propria leva (LEVA_A) -> riesce
  {
    const { data, error } = await clientCoach.from('announcements').insert({
      severity: 'communication', title: 'TEST_AN_COACH_A', body: 'Annuncio leva A', team_sector: LEVA_A, created_by: ctx.users.coach,
    }).select()
    check('Coach inserisce annuncio sulla propria leva (LEVA_A)', !error && data?.length === 1, error?.message)
    if (data?.length === 1) ctx.announcements.coachA = data[0].id
  }

  // Test 2: Coach tenta di inserire un annuncio su un'altra leva (LEVA_B) -> bloccato
  {
    const { error } = await clientCoach.from('announcements').insert({
      severity: 'reminder', title: 'TEST_AN_COACH_B', body: 'Annuncio leva B', team_sector: LEVA_B, created_by: ctx.users.coach,
    })
    check('Coach NON può inserire annuncio su un\'altra leva', !!error, error ? 'bloccato correttamente' : 'INSERIMENTO FUORI LEVA RIUSCITO!')
  }

  // Test 3: Coach tenta di inserire un annuncio con team_sector NULL (tutta la società) -> bloccato
  {
    const { error } = await clientCoach.from('announcements').insert({
      severity: 'urgent', title: 'TEST_AN_COACH_ALL', body: 'Annuncio societario da coach', team_sector: null, created_by: ctx.users.coach,
    })
    check('Coach NON può inserire annuncio "tutta la società" (team_sector NULL)', !!error, error ? 'bloccato correttamente' : 'PRIVILEGIO ADMIN VIOLATO!')
  }

  const clientPresident = await loginAs('president')

  // Test 4: President inserisce un annuncio con team_sector NULL (tutta la società) -> riesce
  {
    const { data, error } = await clientPresident.from('announcements').insert({
      severity: 'urgent', title: 'TEST_AN_PRESIDENT_ALL', body: 'Annuncio societario', team_sector: null, created_by: ctx.users.president,
    }).select()
    check('President inserisce annuncio "tutta la società" (team_sector NULL)', !error && data?.length === 1, error?.message)
    if (data?.length === 1) ctx.announcements.presidentAll = data[0].id
  }

  // Test 5: President inserisce un annuncio su una leva qualsiasi (LEVA_B) -> riesce
  {
    const { data, error } = await clientPresident.from('announcements').insert({
      severity: 'communication', title: 'TEST_AN_PRESIDENT_B', body: 'Annuncio leva B da president', team_sector: LEVA_B, created_by: ctx.users.president,
    }).select()
    check('President inserisce annuncio su una leva qualsiasi (LEVA_B)', !error && data?.length === 1, error?.message)
    if (data?.length === 1) ctx.announcements.presidentB = data[0].id
  }

  // Test 6: Coach (di LEVA_A) in SELECT vede LEVA_A + "tutta la società", ma NON LEVA_B
  {
    const { data, error } = await clientCoach.from('announcements').select('*').like('title', 'TEST_AN_%')
    const titles = (data ?? []).map((a) => a.title)
    const ok = !error
      && titles.includes('TEST_AN_COACH_A')
      && titles.includes('TEST_AN_PRESIDENT_ALL')
      && !titles.includes('TEST_AN_PRESIDENT_B')
    check('Coach LEVA_A vede LEVA_A + società, non LEVA_B', ok, error ? error.message : `titoli visti: ${titles.join(', ')}`)
  }

  // Test 7: Player di LEVA_A in SELECT vede LEVA_A + "tutta la società", ma NON LEVA_B
  const clientA1 = await loginAs('player_a1')
  {
    const { data, error } = await clientA1.from('announcements').select('*').like('title', 'TEST_AN_%')
    const titles = (data ?? []).map((a) => a.title)
    const ok = !error
      && titles.includes('TEST_AN_COACH_A')
      && titles.includes('TEST_AN_PRESIDENT_ALL')
      && !titles.includes('TEST_AN_PRESIDENT_B')
    check('Player LEVA_A vede LEVA_A + società, non LEVA_B', ok, error ? error.message : `titoli visti: ${titles.join(', ')}`)
  }

  // Test 8: Parent con figlio confirmed in LEVA_A e figlio pending in LEVA_B:
  //   vede LEVA_A + società, ma NON LEVA_B (invariante status='confirmed')
  const clientParent = await loginAs('parent')
  {
    const { data, error } = await clientParent.from('announcements').select('*').like('title', 'TEST_AN_%')
    const titles = (data ?? []).map((a) => a.title)
    const ok = !error
      && titles.includes('TEST_AN_COACH_A')
      && titles.includes('TEST_AN_PRESIDENT_ALL')
      && !titles.includes('TEST_AN_PRESIDENT_B')
    check(
      'Parent (figlio confirmed LEVA_A, figlio pending LEVA_B) vede solo LEVA_A + società',
      ok,
      error ? error.message : `titoli visti: ${titles.join(', ')}`
    )
  }

  // Test 9: Player di LEVA_B in SELECT NON vede l'annuncio di LEVA_A
  const clientB1 = await loginAs('player_b1')
  {
    const { data, error } = await clientB1.from('announcements').select('*').like('title', 'TEST_AN_%')
    const titles = (data ?? []).map((a) => a.title)
    const ok = !error
      && !titles.includes('TEST_AN_COACH_A')
      && titles.includes('TEST_AN_PRESIDENT_ALL')
      && titles.includes('TEST_AN_PRESIDENT_B')
    check('Player LEVA_B non vede l\'annuncio di LEVA_A (vede LEVA_B + società)', ok, error ? error.message : `titoli visti: ${titles.join(', ')}`)
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

console.log('\n=== RISULTATI TEST BACHECA ANNUNCI (RLS) ===')
for (const r of results) console.log(r)
console.log(`\n${failures === 0 ? '🟢 Tutti i test degli annunci sono SUPERATI!' : `🔴 ${failures} controlli falliti`}`)
process.exit(failures === 0 ? 0 : 1)
