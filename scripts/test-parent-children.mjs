// Test di integrazione — US-027: Associazione figli a carico
// Verifica gli invarianti di sicurezza di parent_players dopo l'introduzione
// di parent_link_status (pending/confirmed) e delle nuove policy/RPC.
//
// Esecuzione: node scripts/test-parent-children.mjs
// Richiede Supabase locale attivo. Mai puntare al DB di produzione.

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

// --- Sempre contro lo stack locale ---
const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const PASSWORD = `ParentTest!${randomBytes(16).toString('base64url')}`

const results = []
let failures = 0
function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function loginAs(email) {
  const client = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  return client
}

const ctx = {
  parent1Id: null, parent2Id: null, adminId: null, coachId: null,
  playerId: null, seasonId: null,
  parent1Email: `test-pc-parent1@propontedecimo.test`,
  parent2Email: `test-pc-parent2@propontedecimo.test`,
  adminEmail: `test-pc-president@propontedecimo.test`,
  coachEmail: `test-pc-coach@propontedecimo.test`,
}

async function precleanup() {
  const testEmails = [ctx.parent1Email, ctx.parent2Email, ctx.adminEmail, ctx.coachEmail]
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (testEmails.includes(u.email)) {
      await admin.from('parent_players').delete().eq('parent_profile_id', u.id)
      await admin.from('profiles').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  }
  // Rimuovi atleta di test
  const { data: players } = await admin.from('players').select('id').like('first_name', 'TEST_PC%')
  if (players?.length) {
    const ids = players.map(p => p.id)
    await admin.from('parent_players').delete().in('player_id', ids)
    await admin.from('players').delete().in('id', ids)
  }
  // Rimuovi stagione creata se presente
  if (ctx.createdSeasonId) {
    await admin.from('seasons').delete().eq('id', ctx.createdSeasonId)
    ctx.createdSeasonId = null
  }
}

async function setup() {
  // Stagione attiva
  let { data: seasons } = await admin.from('seasons').select('id').eq('is_active', true).limit(1)
  if (!seasons?.length) {
    const { data: s, error: seErr } = await admin.from('seasons').insert({
      name: 'TEST_PC_Season',
      start_date: '2026-07-01',
      end_date: '2027-06-30',
      is_active: true
    }).select('id').single()
    if (seErr) throw new Error(`createSeason error: ${seErr.message}`)
    ctx.seasonId = s.id
    ctx.createdSeasonId = s.id
  } else {
    ctx.seasonId = seasons[0].id
  }

  // Atleta di test - deve superare trg_validate_player_fields (maggiorenne, privacy_accepted, tax_code valido, ecc.)
  const { data: player, error: pe } = await admin.from('players').insert({
    first_name: 'TEST_PC_Player',
    last_name: 'Rossi',
    team_sector: 'Allievi',
    is_active: true,
    is_registered: true,
    season_id: ctx.seasonId,
    birth_date: '1990-01-01',
    birth_place: 'Genova',
    citizenship: 'Italiana',
    address_street: 'Via Test 1',
    address_city: 'Genova',
    address_zip: '16100',
    email: 'test.pc.player@example.com',
    phone_player: '3330000000',
    privacy_accepted: true,
    tax_code: 'RSSMRA80A01F205D'
  }).select('id').single()
  if (pe) throw new Error(`createPlayer error: ${pe.message}`)
  ctx.playerId = player.id

  // Utenti di test
  const roles = [
    { email: ctx.parent1Email, role: 'parent', key: 'parent1Id', name: 'TEST_PC_parent1' },
    { email: ctx.parent2Email, role: 'parent', key: 'parent2Id', name: 'TEST_PC_parent2' },
    { email: ctx.adminEmail, role: 'president', key: 'adminId', name: 'TEST_PC_president' },
    { email: ctx.coachEmail, role: 'coach', key: 'coachId', name: 'TEST_PC_coach' },
  ]
  for (const r of roles) {
    const { data, error } = await admin.auth.admin.createUser({ email: r.email, password: PASSWORD, email_confirm: true })
    if (error) throw new Error(`createUser ${r.email}: ${error.message}`)
    ctx[r.key] = data.user.id
    await admin.from('profiles').upsert({ id: data.user.id, email: r.email, full_name: r.name, role: r.role })
  }
}

async function cleanup() {
  await precleanup()
}

// ── TEST SUITE ────────────────────────────────────────────────────────────────

async function runTests() {
  // ── Scenario 1: Il genitore può inserire una richiesta propria con status='pending' ──
  {
    const client = await loginAs(ctx.parent1Email)
    const { error } = await client.from('parent_players').insert({
      parent_profile_id: ctx.parent1Id,
      player_id: ctx.playerId,
      status: 'pending',
    })
    check(
      'Genitore può inserire richiesta pending propria',
      error === null,
      error?.message
    )
  }

  // ── Scenario 2: Il genitore NON può inserire una riga con status='confirmed' ──
  {
    // Prima rimuovo la riga pending per poter testare con la stessa PK
    await admin.from('parent_players')
      .delete().eq('parent_profile_id', ctx.parent1Id).eq('player_id', ctx.playerId)

    const client = await loginAs(ctx.parent1Email)
    const { error } = await client.from('parent_players').insert({
      parent_profile_id: ctx.parent1Id,
      player_id: ctx.playerId,
      status: 'confirmed',
    })
    check(
      'Genitore NON può inserire richiesta con status=confirmed (bloccata da RLS)',
      error !== null,
      error ? 'blocked ✓' : 'ERRORE: insert riuscita!'
    )
    // Re-inserisco pending per i test successivi
    await admin.from('parent_players').insert({
      parent_profile_id: ctx.parent1Id,
      player_id: ctx.playerId,
      status: 'pending',
    })
  }

  // ── Scenario 3: Il genitore NON può inserire una riga per un altro parent_profile_id ──
  {
    const client = await loginAs(ctx.parent1Email)
    const { error } = await client.from('parent_players').insert({
      parent_profile_id: ctx.parent2Id, // ← diverso dall'utente autenticato
      player_id: ctx.playerId,
      status: 'pending',
    })
    check(
      'Genitore NON può inserire richiesta per un altro genitore (RLS)',
      error !== null,
      error ? 'blocked ✓' : 'ERRORE: insert riuscita!'
    )
  }

  // ── Scenario 4: Con riga pending, le 4 policy *_select_parent NON restituiscono dati ──
  {
    // Aggiunge visita medica e presenza per l'atleta via admin
    await admin.from('players').update({ medical_expiry: '2025-01-01' }).eq('id', ctx.playerId)

    const client = await loginAs(ctx.parent1Email)
    const { data: players } = await client.from('players').select('id').eq('id', ctx.playerId)
    check(
      'Riga pending: players NON visibile al genitore (AC3 — get_parent_player_ids filtra pending)',
      !players?.length,
      players?.length ? `ERRORE: player visibile con pending!` : 'invisible ✓'
    )
  }

  // ── Scenario 5: Admin porta la riga a confirmed → i dati diventano visibili ──
  {
    await admin.from('parent_players')
      .update({ status: 'confirmed' })
      .eq('parent_profile_id', ctx.parent1Id)
      .eq('player_id', ctx.playerId)

    const client = await loginAs(ctx.parent1Email)
    const { data: players } = await client.from('players').select('id').eq('id', ctx.playerId)
    check(
      'Riga confirmed: players visibile al genitore (AC3 — regressione US-002)',
      players?.length === 1,
      players?.length === 1 ? 'visible ✓' : 'ERRORE: non visibile!'
    )
  }

  // ── Scenario 6: Il secondo genitore NON vede le righe del primo (isolamento) ──
  {
    const client2 = await loginAs(ctx.parent2Email)
    const { data: links } = await client2.from('parent_players').select('*')
    const seesParent1Links = links?.some(l => l.parent_profile_id === ctx.parent1Id)
    check(
      'Parent2 NON vede le righe di parent1 (policy parent_players_select_self)',
      !seesParent1Links,
      seesParent1Links ? 'ERRORE: leak di dati!' : 'isolated ✓'
    )
  }

  // ── Scenario 7: Admin crea e rimuove associazioni liberamente ──
  {
    const { error: insertErr } = await admin.from('parent_players').insert({
      parent_profile_id: ctx.parent2Id,
      player_id: ctx.playerId,
      status: 'confirmed',
    })
    check('Admin crea associazione diretta (confirmed)', insertErr === null, insertErr?.message)

    const { error: deleteErr } = await admin.from('parent_players')
      .delete()
      .eq('parent_profile_id', ctx.parent2Id)
      .eq('player_id', ctx.playerId)
    check('Admin rimuove associazione', deleteErr === null, deleteErr?.message)
  }

  // ── Scenario 8: Un coach non ha accesso a nessuna delle policy parent ──
  {
    const clientCoach = await loginAs(ctx.coachEmail)
    const { data: links } = await clientCoach.from('parent_players').select('*')
    check(
      'Coach NON vede le righe di parent_players',
      !links?.length,
      links?.length ? 'ERRORE: leak!' : 'invisible ✓'
    )
  }

  // ── Scenario 9: RPC search_players_for_parent_request — accesso solo da parent ──
  {
    const clientCoach = await loginAs(ctx.coachEmail)
    const { data } = await clientCoach.rpc('search_players_for_parent_request', { p_query: 'TEST' })
    check(
      'search_players_for_parent_request chiamata da coach non restituisce righe',
      !data?.length,
      data?.length ? 'ERRORE: dati visibili!' : 'empty ✓'
    )
  }

  // ── Scenario 10: RPC search_players_for_parent_request — query sotto soglia minima ──
  {
    const clientParent = await loginAs(ctx.parent1Email)
    const { data } = await clientParent.rpc('search_players_for_parent_request', { p_query: 'T' })
    check(
      'search_players_for_parent_request con query 1 char non restituisce righe',
      !data?.length,
      data?.length ? 'ERRORE: dati restituiti!' : 'empty ✓'
    )
  }

  // ── Scenario 11: RPC search_players_for_parent_request — colonne restituite ──
  {
    const clientParent = await loginAs(ctx.parent1Email)
    const { data } = await clientParent.rpc('search_players_for_parent_request', { p_query: 'TEST_PC' })
    const hasSensitiveData = data?.some(row =>
      'tax_code' in row || 'address_street' in row || 'phone_home' in row
    )
    const hasMinimalFields = data?.length > 0 &&
      'id' in data[0] && 'first_name' in data[0] && 'last_name' in data[0] && 'team_sector' in data[0]
    check(
      'search_players_for_parent_request restituisce solo campi minimi (no dati sensibili)',
      hasMinimalFields && !hasSensitiveData,
      hasSensitiveData ? 'ERRORE: dati sensibili esposti!' : 'safe ✓'
    )
  }

  // ── Scenario 12: RPC get_my_parent_players — isolamento tra genitori ──
  {
    const client1 = await loginAs(ctx.parent1Email)
    const client2 = await loginAs(ctx.parent2Email)
    const { data: rows1 } = await client1.rpc('get_my_parent_players')
    const { data: rows2 } = await client2.rpc('get_my_parent_players')
    const parent1SeesOnlyOwn = rows1?.every(r => r.parent_profile_id === ctx.parent1Id)
    const parent2SeesNothing = !rows2?.length // parent2 non ha associazioni
    check(
      'get_my_parent_players: parent1 vede solo le proprie righe',
      parent1SeesOnlyOwn,
      parent1SeesOnlyOwn ? 'isolated ✓' : 'ERRORE: cross-tenant!'
    )
    check(
      'get_my_parent_players: parent2 non vede le righe di parent1',
      parent2SeesNothing,
      parent2SeesNothing ? 'isolated ✓' : 'ERRORE: leak!'
    )
  }
}

// ── Esecuzione ────────────────────────────────────────────────────────────────
console.log('\n🧪 test-parent-children.mjs — US-027\n')
try {
  await precleanup()
  await setup()
  await runTests()
} finally {
  await cleanup()
}

console.log('\nRisultati:')
results.forEach(r => console.log(' ', r))
console.log()
if (failures > 0) {
  console.error(`❌ ${failures} test falliti`)
  process.exit(1)
} else {
  console.log(`✅ Tutti i test passati (${results.length})`)
}
