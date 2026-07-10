// Matrice di accesso RLS (US-002).
// Crea utenti e dati di prova marcati TEST_RLS_*, verifica il comportamento
// delle policy per i 5 ruoli via API e ripulisce tutto a fine esecuzione.
//
// Esecuzione:  node scripts/test-rls.mjs
// Richiede in .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

// --- Gira sempre contro lo stack Supabase locale (vedi CLAUDE.md) ---
const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const ROLES = ['president', 'director', 'coach', 'player', 'parent']
// Password monouso generata a runtime: mai una credenziale fissa nel repo
// (gli utenti di prova vivono sul DB reale per la durata della run).
const PASSWORD = `Rls!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-rls-${role}@propontedecimo.test`
const LEVA_A = 'TEST_RLS_LEVA_A'
const LEVA_B = 'TEST_RLS_LEVA_B'

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

const ctx = { users: {}, players: {}, payments: {} }

// Rimuove residui di run precedenti fallite: senza, createUser fallisce con
// "already registered" e lo script resta bloccato finché non si pulisce a mano.
async function precleanup() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-rls-') && u.email?.endsWith('@propontedecimo.test')) {
      await admin.from('parent_players').delete().eq('parent_profile_id', u.id)
      await admin.from('coach_teams').delete().eq('profile_id', u.id)
      await admin.from('profiles').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  }
  const { data: leftovers } = await admin.from('players').select('id').like('first_name', 'TEST_RLS%')
  if (leftovers?.length) {
    const ids = leftovers.map((p) => p.id)
    await admin.from('attendance').delete().in('player_id', ids)
    await admin.from('payments').delete().in('player_id', ids)
    await admin.from('parent_players').delete().in('player_id', ids)
    await admin.from('players').delete().in('id', ids)
  }
}

async function setup() {
  // utenti (il trigger handle_new_user crea il profilo; il ruolo si imposta via service key)
  for (const role of ROLES) {
    const { data, error } = await admin.auth.admin.createUser({
      email: emailFor(role), password: PASSWORD, email_confirm: true,
    })
    if (error) throw new Error(`createUser ${role}: ${error.message}`)
    ctx.users[role] = data.user.id
    const { error: e2 } = await admin.from('profiles')
      .upsert({ id: data.user.id, email: emailFor(role), full_name: `TEST_RLS_${role}`, role })
    if (e2) throw new Error(`profilo ${role}: ${e2.message}`)
  }

  // stagione esistente per le FK (se manca, la creiamo)
  let { data: seasons, error: es } = await admin.from('seasons').select('id').eq('is_active', true).limit(1)
  if (es) throw new Error(`errore query stagioni: ${es.message}`)
  if (!seasons || seasons.length === 0) {
    const { data: newSeason, error: seErr } = await admin.from('seasons')
      .insert({ name: 'TEST_RLS_SEASON', start_date: '2026-07-01', end_date: '2027-06-30', is_active: true })
      .select('id').single()
    if (seErr) throw new Error(`errore creazione stagione di test: ${seErr.message}`)
    ctx.seasonId = newSeason.id
    ctx.createdSeasonId = newSeason.id
  } else {
    ctx.seasonId = seasons[0].id
  }

  // atleti: A nella leva del coach (e collegato all'utente player), B in un'altra leva
  // NB: dall'introduzione di US-009 (trg_validate_player_fields) un insert diretto sui
  // giocatori deve soddisfare tutti i campi obbligatori; qui sono atleti maggiorenni
  // di test, quindi non serve alcun contatto genitore.
  const mk = (last, sector, profile_id = null) => ({
    first_name: 'TEST_RLS', last_name: last, team_sector: sector,
    season_id: ctx.seasonId, is_active: true, profile_id,
    birth_date: '1990-01-01', birth_place: 'Genova', citizenship: 'Italiana',
    address_street: 'Via Test 1', address_city: 'Genova', address_zip: '16100',
    email: `test.rls.${last === 'ATLETA_A' ? 'a' : 'b'}@example.com`, phone_player: '3330000000',
    privacy_accepted: true, tax_code: last === 'ATLETA_A' ? 'RLSATA90A01D969A' : 'RLSATB90A01D969B',
  })
  const { data: players, error: ep } = await admin.from('players')
    .insert([mk('ATLETA_A', LEVA_A, ctx.users.player), mk('ATLETA_B', LEVA_B)])
    .select('id,last_name')
  if (ep) throw new Error(`players: ${ep.message}`)
  for (const p of players) ctx.players[p.last_name === 'ATLETA_A' ? 'A' : 'B'] = p.id

  // pagamenti per entrambi
  const { data: pays, error: epay } = await admin.from('payments')
    .insert([
      { player_id: ctx.players.A, season_id: ctx.seasonId, installment_no: 1, amount_eur: 10, notes: 'TEST_RLS' },
      { player_id: ctx.players.B, season_id: ctx.seasonId, installment_no: 1, amount_eur: 10, notes: 'TEST_RLS' },
    ]).select('id,player_id')
  if (epay) throw new Error(`payments: ${epay.message}`)
  for (const p of pays) ctx.payments[p.player_id === ctx.players.A ? 'A' : 'B'] = p.id

  // il coach segue la leva A; il parent è associato all'atleta A
  const { error: ect } = await admin.from('coach_teams')
    .insert({ profile_id: ctx.users.coach, team_sector: LEVA_A })
  if (ect) throw new Error(`coach_teams: ${ect.message}`)
  const { error: epp } = await admin.from('parent_players')
    .insert({ parent_profile_id: ctx.users.parent, player_id: ctx.players.A })
  if (epp) throw new Error(`parent_players: ${epp.message}`)
}

async function runMatrix() {
  const testPlayers = (c) => c.from('players').select('id,last_name').like('first_name', 'TEST_RLS%')
  const testPayments = (c) => c.from('payments').select('id,player_id').eq('notes', 'TEST_RLS')

  // --- PRESIDENT: CRUD completo ---
  {
    const c = await loginAs('president')
    const { data } = await testPlayers(c)
    check('president vede entrambi gli atleti di test', data?.length === 2, `visti ${data?.length}`)
    const { error } = await c.from('players').update({ notes: 'TEST_RLS upd' }).eq('id', ctx.players.A)
    check('president può aggiornare un atleta', !error, error?.message)
    const { data: pay } = await testPayments(c)
    check('president vede tutti i pagamenti di test', pay?.length === 2, `visti ${pay?.length}`)
    const { error: er } = await c.from('profiles').update({ role: 'director' }).eq('id', ctx.users.player)
    check('president può cambiare i ruoli', !er, er?.message)
    if (!er) {
      const { error: erRestore } = await admin.from('profiles').update({ role: 'player' }).eq('id', ctx.users.player)
      check('ripristino ruolo player riuscito (precondizione test successivi)', !erRestore, erRestore?.message)
    }
    await c.auth.signOut()
  }

  // --- DIRECTOR: gestisce dati ma non i ruoli ---
  {
    const c = await loginAs('director')
    const { data } = await testPlayers(c)
    check('director vede entrambi gli atleti di test', data?.length === 2, `visti ${data?.length}`)
    const { data: pay } = await testPayments(c)
    check('director vede i pagamenti', pay?.length === 2, `visti ${pay?.length}`)
    const { error: er } = await c.from('profiles').update({ role: 'president' }).eq('id', ctx.users.director)
    check('director NON può cambiare ruoli (anti-escalation)', !!er, er ? 'bloccato dal trigger' : 'ESCALATION RIUSCITA!')
    await c.auth.signOut()
  }

  // --- COACH: solo la propria leva, zero dati finanziari ---
  {
    const c = await loginAs('coach')
    const { data } = await testPlayers(c)
    check('coach vede solo l\'atleta della propria leva', data?.length === 1 && data[0].last_name === 'ATLETA_A', `visti ${data?.length}`)
    const { data: pay } = await testPayments(c)
    check('coach NON vede alcun pagamento', (pay ?? []).length === 0, `visti ${pay?.length}`)
    const { error: eIn } = await c.from('attendance')
      .insert({ player_id: ctx.players.A, session_date: '2026-07-05', status: 'present', created_by: ctx.users.coach })
    check('coach registra presenze per la propria leva', !eIn, eIn?.message)
    const { error: eOut } = await c.from('attendance')
      .insert({ player_id: ctx.players.B, session_date: '2026-07-05', status: 'present', created_by: ctx.users.coach })
    check('coach NON registra presenze per altre leve', !!eOut, eOut ? 'bloccato' : 'INSERITO FUORI LEVA!')
    const { error: er } = await c.from('profiles').update({ role: 'president' }).eq('id', ctx.users.coach)
    check('coach NON può auto-promuoversi', !!er, er ? 'bloccato dal trigger' : 'ESCALATION RIUSCITA!')
    const { error: eSelf } = await c.from('coach_teams').insert({ profile_id: ctx.users.coach, team_sector: LEVA_B })
    check('coach NON può auto-assegnarsi una leva', !!eSelf, eSelf ? 'bloccato' : 'AUTO-ASSEGNAZIONE RIUSCITA!')
    const { data: updP } = await c.from('players').update({ notes: 'coach edit' }).eq('id', ctx.players.A).select()
    check('coach NON può modificare l\'anagrafica atleti', (updP ?? []).length === 0, updP?.length ? 'MODIFICA RIUSCITA!' : 'nessuna riga modificata')
    await c.auth.signOut()
  }

  // --- PLAYER: sola lettura sui propri dati ---
  {
    const c = await loginAs('player')
    const { data } = await testPlayers(c)
    check('player vede solo il proprio record', data?.length === 1 && data[0].last_name === 'ATLETA_A', `visti ${data?.length}`)
    const { data: pay } = await testPayments(c)
    check('player vede solo i propri pagamenti', pay?.length === 1 && pay[0].player_id === ctx.players.A, `visti ${pay?.length}`)
    const { data: upd } = await c.from('players').update({ notes: 'hack' }).eq('id', ctx.players.A).select()
    check('player NON può modificare l\'anagrafica', (upd ?? []).length === 0, upd?.length ? 'MODIFICA RIUSCITA!' : 'nessuna riga modificata')
    const { error: er } = await c.from('profiles').update({ role: 'president' }).eq('id', ctx.users.player)
    check('player NON può auto-promuoversi', !!er, er ? 'bloccato dal trigger' : 'ESCALATION RIUSCITA!')
    await c.auth.signOut()
  }

  // --- PARENT: sola lettura sui figli associati ---
  {
    const c = await loginAs('parent')
    const { data } = await testPlayers(c)
    check('parent vede solo il figlio associato', data?.length === 1 && data[0].last_name === 'ATLETA_A', `visti ${data?.length}`)
    const { data: pay } = await testPayments(c)
    check('parent vede solo i pagamenti del figlio', pay?.length === 1 && pay[0].player_id === ctx.players.A, `visti ${pay?.length}`)
    const { data: upd } = await c.from('players').update({ notes: 'hack' }).eq('id', ctx.players.A).select()
    check('parent NON può modificare i dati del figlio', (upd ?? []).length === 0, upd?.length ? 'MODIFICA RIUSCITA!' : 'nessuna riga modificata')
    await c.auth.signOut()
  }

  // --- ANON: nessun accesso ---
  {
    const c = createClient(URL_, ANON, { auth: { persistSession: false } })
    const { data } = await testPlayers(c)
    check('anonimo non vede alcun atleta', (data ?? []).length === 0, `visti ${data?.length}`)
  }
}

async function cleanup() {
  await admin.from('attendance').delete().in('player_id', Object.values(ctx.players))
  await admin.from('payments').delete().eq('notes', 'TEST_RLS')
  await admin.from('parent_players').delete().eq('parent_profile_id', ctx.users.parent ?? '00000000-0000-0000-0000-000000000000')
  await admin.from('coach_teams').delete().eq('profile_id', ctx.users.coach ?? '00000000-0000-0000-0000-000000000000')
  await admin.from('players').delete().like('first_name', 'TEST_RLS%')
  for (const id of Object.values(ctx.users)) {
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
  }
  if (ctx.createdSeasonId) {
    await admin.from('seasons').delete().eq('id', ctx.createdSeasonId)
  }
}

try {
  console.log('Pre-cleanup residui di run precedenti...')
  await precleanup()
  console.log('Setup dati di prova (marcati TEST_RLS_*)...')
  await setup()
  console.log('Esecuzione matrice di accesso...\n')
  await runMatrix()
} catch (e) {
  failures++
  results.push(`❌ ERRORE FATALE: ${e.message}`)
} finally {
  console.log('Cleanup dati di prova...')
  try { await cleanup() } catch (e) { console.error('Cleanup incompleto:', e.message) }
}

console.log('\n=== MATRICE DI ACCESSO RLS ===')
for (const r of results) console.log(r)
console.log(`\n${failures === 0 ? '🟢 Tutti i controlli superati' : `🔴 ${failures} controlli falliti`}`)
process.exit(failures === 0 ? 0 : 1)
