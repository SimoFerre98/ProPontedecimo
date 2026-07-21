// Integration test per Visualizzazione convocazioni (US-030).
// Verifica la RPC get_my_next_call_up() in vari scenari:
// - convocato / non convocato
// - bozza (esito sempre nascosto)
// - nessuna partita
// - profilo non collegato
// - isolamento tra le leve
//
// Esecuzione:  node scripts/test-player-next-callup.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `NextCallUp!${randomBytes(24).toString('base64url')}`
const emailFor = (name) => `test-nc-${name}@propontedecimo.test`
const LEVA_A = 'TEST_NC_LEVA_A'
const LEVA_B = 'TEST_NC_LEVA_B'

const results = []
let failures = 0
function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function loginAs(name) {
  const client = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email: emailFor(name), password: PASSWORD })
  if (error) throw new Error(`login ${name}: ${error.message}`)
  return client
}

const ctx = {
  users: {},
  seasons: {},
  players: {},
  events: {},
}

async function precleanup() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const staleIds = []
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-nc-') && u.email?.endsWith('@propontedecimo.test')) {
      staleIds.push(u.id)
    }
  }
  if (staleIds.length > 0) {
    await admin.from('profiles').delete().in('id', staleIds)
    for (const id of staleIds) {
      await admin.auth.admin.deleteUser(id)
    }
  }

  const { data: staleEvents } = await admin.from('events').select('id').like('title', 'TEST_NC_%')
  if (staleEvents?.length) {
    const eventIds = staleEvents.map((e) => e.id)
    await admin.from('call_ups').delete().in('event_id', eventIds)
    await admin.from('events').delete().in('id', eventIds)
  }

  const { data: stalePlayers } = await admin.from('players').select('id').like('first_name', 'TEST_NC_%')
  if (stalePlayers?.length) {
    const playerIds = stalePlayers.map((p) => p.id)
    await admin.from('call_ups').delete().in('player_id', playerIds)
    await admin.from('players').delete().in('id', playerIds)
  }

  await admin.from('seasons').delete().like('name', 'TEST_NC_%')
}

async function cleanup() {
  console.log('Cleaning up test data...')
  const eventIds = Object.values(ctx.events)
  const playerIds = Object.values(ctx.players)
  if (eventIds.length > 0) {
    await admin.from('call_ups').delete().in('event_id', eventIds)
    await admin.from('events').delete().in('id', eventIds)
  }
  if (playerIds.length > 0) {
    await admin.from('call_ups').delete().in('player_id', playerIds)
    await admin.from('players').delete().in('id', playerIds)
  }
  for (const name of Object.keys(ctx.users)) {
    const id = ctx.users[name]
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
  }
  for (const key of Object.keys(ctx.seasons)) {
    await admin.from('seasons').delete().eq('id', ctx.seasons[key])
  }
  console.log('Cleanup finished.')
}

async function setup() {
  console.log('Setting up database state for test...')
  
  // Set all existing seasons to not active to ensure our test active season is the only active one
  await admin.from('seasons').update({ is_active: false }).eq('is_active', true)

  // 1. Stagione attiva
  const { data: season, error: es } = await admin.from('seasons').insert({
    name: 'TEST_NC_SEASON', start_date: '2026-07-01', end_date: '2027-06-30', is_active: true,
  }).select('id').single()
  if (es) throw es
  ctx.seasons.s1 = season.id

  // 2. Utenti: player_a (Leva A), player_b (Leva B), user_unlinked (Profilo senza player)
  const mkUser = async (name, role) => {
    const { data: u, error: eu } = await admin.auth.admin.createUser({
      email: emailFor(name), password: PASSWORD, email_confirm: true,
    })
    if (eu) throw eu
    ctx.users[name] = u.user.id
    const { error: ep } = await admin.from('profiles').upsert({
      id: u.user.id, email: emailFor(name), full_name: `TEST_NC_${name.toUpperCase()}`, role,
    })
    if (ep) throw ep
  }

  await mkUser('player_a', 'player')
  await mkUser('player_b', 'player')
  await mkUser('user_unlinked', 'player')

  // 3. Giocatori
  const mkPlayer = (first, last, sector, profileId, taxSuffix) => ({
    first_name: 'TEST_NC_' + first,
    last_name: last,
    team_sector: sector,
    season_id: ctx.seasons.s1,
    is_active: true,
    profile_id: profileId,
    birth_date: '1990-01-01',
    birth_place: 'Genova',
    citizenship: 'Italiana',
    address_street: 'Via Test',
    address_city: 'Genova',
    address_zip: '16100',
    email: `nc.${last.toLowerCase()}@test.it`,
    phone_player: '3331122333',
    privacy_accepted: true,
    tax_code: `RSSMRA90A01D969${taxSuffix}`,
  })

  const { data: pA, error: epA } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'A', LEVA_A, ctx.users.player_a, 'A')
  ).select('id').single()
  if (epA) throw epA
  ctx.players.a = pA.id

  const { data: pB, error: epB } = await admin.from('players').insert(
    mkPlayer('PLAYER', 'B', LEVA_B, ctx.users.player_b, 'B')
  ).select('id').single()
  if (epB) throw epB
  ctx.players.b = pB.id
}

async function run() {
  try {
    await precleanup()
    await setup()

    const clientA = await loginAs('player_a')
    const clientB = await loginAs('player_b')
    const clientUnlinked = await loginAs('user_unlinked')

    const future1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Domani
    const future2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // Dopodomani
    // --- SCENARIO 4: Nessuna partita in programma per la leva ---
    {
      const { data, error } = await clientA.rpc('get_my_next_call_up')
      check('RPC get_my_next_call_up executes without error when no matches exist', !error)
      check('Returns 1 row when no match exists', data?.length === 1)
      check('Row returns NULL for match fields when no match exists', data?.[0].opponent === null && data?.[0].start_date === null)
      check('Row returns is_called_up = false when no match exists', data?.[0].is_called_up === false)
      check('Row returns is_published = false when no match exists', data?.[0].is_published === false)
    }

    // --- SCENARIO 5: Profilo non collegato a nessun player attivo ---
    {
      const { data, error } = await clientUnlinked.rpc('get_my_next_call_up')
      check('RPC get_my_next_call_up executes without error for unlinked profile', !error)
      check('Returns 0 rows for unlinked profile', data?.length === 0)
    }

    // --- SCENARIO 1: Partita programmata ma convocazione in bozza (non pubblicata) ---
    // Creiamo il match per LEVA_A
    const { data: evA1, error: eeA1 } = await admin.from('events').insert({
      title: 'TEST_NC_MATCH_A1',
      event_type: 'home_match',
      start_date: future1,
      meetup_time: future1,
      opponent: 'AVVERSARIO_A1',
      team_sector: LEVA_A,
      call_up_published_at: null, // Bozza
    }).select('id').single()
    if (eeA1) throw eeA1
    ctx.events.a1 = evA1.id

    // Aggiungiamo convocazione per il giocatore A (ma non è ancora pubblicata)
    const { error: ecuA1 } = await admin.from('call_ups').insert({
      event_id: ctx.events.a1,
      player_id: ctx.players.a,
    })
    if (ecuA1) throw ecuA1

    {
      const { data, error } = await clientA.rpc('get_my_next_call_up')
      check('RPC returns details for unpublished match', !error && data?.length === 1)
      check('Unpublished match shows correct opponent', data?.[0].opponent === 'AVVERSARIO_A1')
      check('Unpublished match keeps is_called_up = false (draft gate works)', data?.[0].is_called_up === false)
      check('Unpublished match keeps is_published = false', data?.[0].is_published === false)
    }

    // --- SCENARIO 2: Convocazione pubblicata e giocatore convocato ---
    // Pubblichiamo la partita
    const { error: ePub } = await admin.from('events').update({
      call_up_published_at: new Date().toISOString(),
    }).eq('id', ctx.events.a1)
    if (ePub) throw ePub

    {
      const { data, error } = await clientA.rpc('get_my_next_call_up')
      check('RPC returns details for published match', !error && data?.length === 1)
      check('Published match returns is_called_up = true when convocato', data?.[0].is_called_up === true)
      check('Published match returns is_published = true', data?.[0].is_published === true)
    }

    // --- SCENARIO 3: Convocazione pubblicata ma giocatore NON convocato ---
    // Rimuoviamo la convocazione per il giocatore A
    const { error: eDelCu } = await admin.from('call_ups').delete().eq('event_id', ctx.events.a1).eq('player_id', ctx.players.a)
    if (eDelCu) throw eDelCu

    {
      const { data, error } = await clientA.rpc('get_my_next_call_up')
      check('Published match returns is_called_up = false when NOT convocato', data?.[0].is_called_up === false)
      check('Published match keeps is_published = true', data?.[0].is_published === true)
    }

    // --- SCENARIO 6: Isolamento tra le leve e ordinamento per data ---
    // Creiamo una partita per LEVA_B (pubblicata)
    const { data: evB, error: eeB } = await admin.from('events').insert({
      title: 'TEST_NC_MATCH_B',
      event_type: 'away_match',
      start_date: future2,
      meetup_time: future2,
      opponent: 'AVVERSARIO_B',
      team_sector: LEVA_B,
      call_up_published_at: new Date().toISOString(),
    }).select('id').single()
    if (eeB) throw eeB
    ctx.events.b = evB.id

    // Convochiamo il giocatore B
    const { error: ecuB } = await admin.from('call_ups').insert({
      event_id: ctx.events.b,
      player_id: ctx.players.b,
    })
    if (ecuB) throw ecuB

    {
      // Player A (Leva A) deve continuare a vedere solo la propria partita (anche se non convocato)
      const { data: dataA } = await clientA.rpc('get_my_next_call_up')
      check('Player A does not see Player B match', dataA?.[0].opponent === 'AVVERSARIO_A1')

      // Player B (Leva B) deve vedere la propria partita convocato
      const { data: dataB } = await clientB.rpc('get_my_next_call_up')
      check('Player B sees their own match', dataB?.[0].opponent === 'AVVERSARIO_B')
      check('Player B is_called_up is true', dataB?.[0].is_called_up === true)
    }

    // Aggiungiamo un'altra partita per LEVA_A che è più lontana nel tempo
    const { data: evA2, error: eeA2 } = await admin.from('events').insert({
      title: 'TEST_NC_MATCH_A2',
      event_type: 'home_match',
      start_date: future2,
      meetup_time: future2,
      opponent: 'AVVERSARIO_A2_FUTURE',
      team_sector: LEVA_A,
      call_up_published_at: new Date().toISOString(),
    }).select('id').single()
    if (eeA2) throw eeA2
    ctx.events.a2 = evA2.id

    {
      // Player A deve continuare a vedere il match A1 che è il più prossimo, non A2
      const { data } = await clientA.rpc('get_my_next_call_up')
      check('Player A sees the nearest match (ordered by start_date ASC)', data?.[0].opponent === 'AVVERSARIO_A1')
    }

  } catch (err) {
    console.error('Test execution failed with error:', err)
    failures++
  } finally {
    await cleanup()
  }

  console.log('\n--- TEST RESULTS ---')
  results.forEach((r) => console.log(r))
  console.log('--------------------')

  if (failures > 0) {
    console.log(`❌ Test failed with ${failures} failure(s).`)
    process.exit(1)
  } else {
    console.log('✅ All tests passed successfully.')
    process.exit(0)
  }
}

run()
