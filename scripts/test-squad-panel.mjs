// Integration test per il Pannello gestione atleti della squadra (US-033).
// Verifica che la query di medicalService.getSquadRoster (players filtrata per
// season_id/is_active/team_sector) rispetti la RLS players_select_coach già
// esistente (US-002) per allenatori mono-leva e multi-leva, e che il coach non
// possa mai leggere dati di payments — contro Supabase LOCALE.
//
// Esecuzione:  node scripts/test-squad-panel.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

// --- Gira sempre contro lo stack Supabase locale (vedi CLAUDE.md) ---
const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `SquadPanel!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-sqp-${role}@propontedecimo.test`
const LEVA_A = 'TEST_SQP_LEVA_A'
const LEVA_B = 'TEST_SQP_LEVA_B'
const LEVA_C = 'TEST_SQP_LEVA_C'

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
}

// Esegue esattamente la query di medicalService.getSquadRoster(seasonId, sector?)
// tramite il client passato (autenticato come coach), senza importare il file TS.
function squadRosterQuery(client, seasonId, sector) {
  let query = client
    .from('players')
    .select('id, first_name, last_name, birth_date, figc_registration, team_sector, medical_expiry')
    .eq('season_id', seasonId)
    .eq('is_active', true)

  if (sector && sector !== 'all') {
    query = query.eq('team_sector', sector)
  }

  return query.order('last_name').order('first_name')
}

// Rimuove residui di run precedenti fallite (stesso motivo di test-call-ups.mjs:
// senza, createUser fallisce con "already registered" e lo script si blocca).
async function precleanup() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const staleIds = []
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-sqp-') && u.email?.endsWith('@propontedecimo.test')) {
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

  const { data: stalePlayers } = await admin.from('players').select('id').like('first_name', 'TEST_SQP_%')
  if (stalePlayers?.length) {
    const playerIds = stalePlayers.map((p) => p.id)
    await admin.from('payments').delete().in('player_id', playerIds)
    await admin.from('players').delete().in('id', playerIds)
  }

  await admin.from('coach_teams').delete().like('team_sector', 'TEST_SQP_%')
  await admin.from('seasons').delete().like('name', 'TEST_SQP_%')
}

async function cleanup() {
  console.log('Cleaning up test data...')

  // Pagamenti + giocatori (payments ha ON DELETE CASCADE su player_id, ma
  // ripuliamo esplicitamente per chiarezza e simmetria con precleanup).
  const playerIds = Object.values(ctx.players)
  if (playerIds.length > 0) {
    await admin.from('payments').delete().in('player_id', playerIds)
  }
  await admin.from('players').delete().like('first_name', 'TEST_SQP_%')

  // Associazioni coach-team
  if (Object.values(ctx.users).length > 0) {
    await admin.from('coach_teams').delete().in('profile_id', Object.values(ctx.users))
  }

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
    name: 'TEST_SQP_SEASON', start_date: '2026-07-01', end_date: '2027-06-30', is_active: false,
  }).select('id').single()
  if (es) throw es
  ctx.seasons.s1 = season.id

  // 2. Coach:
  //    - coach_mono: assegnato solo a LEVA_A
  //    - coach_multi: assegnato a LEVA_A e LEVA_B (non LEVA_C)
  //    - coach_empty: nessuna riga in coach_teams (AC "coach senza atleti")
  const mkCoach = async (role) => {
    const { data: user, error: eu } = await admin.auth.admin.createUser({
      email: emailFor(role), password: PASSWORD, email_confirm: true,
    })
    if (eu) throw eu
    ctx.users[role] = user.user.id
    const { error: ep } = await admin.from('profiles').upsert({
      id: ctx.users[role], email: emailFor(role), full_name: `TEST_SQP_${role.toUpperCase()}`, role: 'coach',
    })
    if (ep) throw ep
  }
  await mkCoach('coach_mono')
  await mkCoach('coach_multi')
  await mkCoach('coach_empty')

  const { error: ectm } = await admin.from('coach_teams').insert({
    profile_id: ctx.users.coach_mono, team_sector: LEVA_A,
  })
  if (ectm) throw ectm

  const { error: ectx } = await admin.from('coach_teams').insert([
    { profile_id: ctx.users.coach_multi, team_sector: LEVA_A },
    { profile_id: ctx.users.coach_multi, team_sector: LEVA_B },
  ])
  if (ectx) throw ectx
  // coach_empty: nessuna riga in coach_teams, di proposito.

  // 3. Giocatori: A1/A2 attivi + A3 inattivo in LEVA_A, B1 attivo in LEVA_B,
  //    C1 attivo in LEVA_C (leva non assegnata a nessun coach di questo test).
  //    A2 ha medical_expiry NULL per verificare che il campo nullable non
  //    causi errori nella query.
  const mkPlayer = (first, last, sector, taxSuffix, opts = {}) => ({
    first_name: 'TEST_SQP_' + first,
    last_name: last,
    team_sector: sector,
    season_id: ctx.seasons.s1,
    is_active: opts.isActive ?? true,
    birth_date: '1990-01-01',
    birth_place: 'Genova',
    citizenship: 'Italiana',
    address_street: 'Via Test',
    address_city: 'Genova',
    address_zip: '16100',
    email: `sqp.${last.toLowerCase()}@test.it`,
    phone_player: '3331122333',
    privacy_accepted: true,
    tax_code: `RSSMRA90A01D969${taxSuffix}`,
    figc_registration: `FIGC${taxSuffix}`,
    medical_expiry: opts.medicalExpiry === undefined ? '2027-01-01' : opts.medicalExpiry,
  })

  const { data: pA1, error: epA1 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'A1', LEVA_A, 'A')
  ).select('id').single()
  if (epA1) throw epA1
  ctx.players.a1 = pA1.id

  const { data: pA2, error: epA2 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'A2', LEVA_A, 'B', { medicalExpiry: null })
  ).select('id').single()
  if (epA2) throw epA2
  ctx.players.a2 = pA2.id

  const { data: pA3, error: epA3 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'A3', LEVA_A, 'C', { isActive: false })
  ).select('id').single()
  if (epA3) throw epA3
  ctx.players.a3 = pA3.id

  const { data: pB1, error: epB1 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'B1', LEVA_B, 'D')
  ).select('id').single()
  if (epB1) throw epB1
  ctx.players.b1 = pB1.id

  const { data: pC1, error: epC1 } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'C1', LEVA_C, 'E')
  ).select('id').single()
  if (epC1) throw epC1
  ctx.players.c1 = pC1.id

  // 4. Un pagamento reale su A1, per verificare che il coach non lo veda mai
  //    (né tramite select diretta su payments, né come proprietà nel roster).
  const { error: epay } = await admin.from('payments').insert({
    player_id: ctx.players.a1, season_id: ctx.seasons.s1, installment_no: 1, amount_eur: 350.00,
  })
  if (epay) throw epay

  console.log('Setup finished.')
}

async function runTests() {
  console.log('Running squad panel tests...')

  const clientMono = await loginAs('coach_mono')
  const clientMulti = await loginAs('coach_multi')
  const clientEmpty = await loginAs('coach_empty')

  // Test 1: coach mono-leva vede solo i propri atleti attivi di LEVA_A
  {
    const { data, error } = await squadRosterQuery(clientMono, ctx.seasons.s1)
    const ids = (data ?? []).map((p) => p.id).sort()
    const expected = [ctx.players.a1, ctx.players.a2].sort()
    check(
      'Coach mono-leva vede solo i propri atleti attivi (A1, A2) di LEVA_A',
      !error && JSON.stringify(ids) === JSON.stringify(expected),
      error ? error.message : `ids ricevuti: ${ids.join(', ')}`
    )

    const sectors = new Set((data ?? []).map((p) => p.team_sector))
    check(
      'Coach mono-leva non vede atleti di un\'altra leva',
      sectors.size <= 1 && (sectors.size === 0 || sectors.has(LEVA_A)),
      `leve viste: ${[...sectors].join(', ') || '(nessuna)'}`
    )

    const hasInactive = (data ?? []).some((p) => p.id === ctx.players.a3)
    check('Atleta is_active=false (A3) non compare nei risultati', !hasInactive)

    const a2 = (data ?? []).find((p) => p.id === ctx.players.a2)
    check(
      'Atleta con medical_expiry NULL (A2) non causa errori ed è presente con valore null',
      !error && !!a2 && a2.medical_expiry === null,
      a2 ? `medical_expiry: ${a2.medical_expiry}` : 'A2 non trovato'
    )
  }

  // Test 2: coach multi-leva vede gli atleti di ENTRAMBE le proprie leve
  //         (A1, A2, B1) e nessun atleto della leva non assegnata (C1)
  {
    const { data, error } = await squadRosterQuery(clientMulti, ctx.seasons.s1)
    const ids = (data ?? []).map((p) => p.id).sort()
    const expected = [ctx.players.a1, ctx.players.a2, ctx.players.b1].sort()
    check(
      'Coach multi-leva vede gli atleti attivi di entrambe le proprie leve (A1, A2, B1)',
      !error && JSON.stringify(ids) === JSON.stringify(expected),
      error ? error.message : `ids ricevuti: ${ids.join(', ')}`
    )

    const hasC1 = (data ?? []).some((p) => p.id === ctx.players.c1)
    check('Coach multi-leva NON vede atleti della leva non assegnata (LEVA_C)', !hasC1)

    const hasInactive = (data ?? []).some((p) => p.id === ctx.players.a3)
    check('Coach multi-leva non vede l\'atleta inattivo A3', !hasInactive)
  }

  // Test 2b: filtro esplicito per leva (parametro sector di getSquadRoster)
  //          sulla stessa query, lato coach multi-leva
  {
    const { data, error } = await squadRosterQuery(clientMulti, ctx.seasons.s1, LEVA_B)
    check(
      'Il filtro esplicito per leva limita ai soli atleti di quella leva (LEVA_B -> solo B1)',
      !error && data?.length === 1 && data[0].id === ctx.players.b1,
      error ? error.message : `ids ricevuti: ${(data ?? []).map((p) => p.id).join(', ')}`
    )
  }

  // Test 3: coach senza alcuna leva assegnata (nessuna riga in coach_teams)
  //         riceve una lista vuota, non un errore
  {
    const { data, error } = await squadRosterQuery(clientEmpty, ctx.seasons.s1)
    check(
      'Coach senza leve assegnate riceve una lista vuota, non un errore',
      !error && (data?.length ?? 0) === 0,
      error ? error.message : `righe ricevute: ${data?.length}`
    )
  }

  // Test 4: nessun dato finanziario è mai raggiungibile dal coach
  {
    const { data, error } = await clientMono.from('payments').select('*')
    const noRows = (data?.length ?? 0) === 0
    check(
      'Il coach non può leggere righe di payments (RLS: 0 righe o errore)',
      noRows,
      error ? `bloccato con errore: ${error.message}` : `righe restituite: ${data?.length}`
    )
  }
  {
    const { data, error } = await squadRosterQuery(clientMono, ctx.seasons.s1)
    const forbiddenKeys = ['amount', 'amount_eur', 'paid_amount_eur', 'payments', 'payment_method', 'receipt_number']
    const leaked = (data ?? []).some((row) =>
      forbiddenKeys.some((k) => Object.prototype.hasOwnProperty.call(row, k))
    )
    check(
      'Le righe del roster non includono mai proprietà/colonne di payments',
      !error && !leaked,
      leaked && data?.length ? `chiavi viste: ${Object.keys(data[0]).join(', ')}` : (error?.message ?? '')
    )
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

console.log('\n=== RISULTATI TEST PANNELLO SQUADRA (US-033) ===')
for (const r of results) console.log(r)
console.log(`\n${failures === 0 ? '🟢 Tutti i test del pannello squadra sono SUPERATI!' : `🔴 ${failures} controlli falliti`}`)
process.exit(failures === 0 ? 0 : 1)
