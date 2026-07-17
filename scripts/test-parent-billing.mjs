// Test di integrazione — US-028: Bilancio e scadenze dei figli
// Verifica che un genitore possa leggere correttamente i pagamenti e le scadenze mediche
// per i soli figli confermati, mentre resti isolato da figli pending o altrui,
// e che i casi limite (nessun pagamento) si comportino come previsto.
//
// Esecuzione: node scripts/test-parent-billing.mjs
// Richiede Supabase locale attivo. Mai puntare al DB di produzione.

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const PASSWORD = `ParentBillingTest!${randomBytes(16).toString('base64url')}`

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
  parent1Id: null,
  parent2Id: null,
  playerConfirmedId: null,
  playerPendingId: null,
  playerOtherId: null,
  playerNoPaymentsId: null,
  seasonId: null,
  parent1Email: `test-pb-parent1@propontedecimo.test`,
  parent2Email: `test-pb-parent2@propontedecimo.test`,
}

async function precleanup() {
  const testEmails = [ctx.parent1Email, ctx.parent2Email]
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (testEmails.includes(u.email)) {
      await admin.from('parent_players').delete().eq('parent_profile_id', u.id)
      await admin.from('profiles').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  }

  // Rimuovi atleti di test
  const { data: players } = await admin.from('players').select('id').like('first_name', 'TEST_PB%')
  if (players?.length) {
    const ids = players.map(p => p.id)
    await admin.from('payments').delete().in('player_id', ids)
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
  // 1. Stagione attiva
  let { data: seasons } = await admin.from('seasons').select('id').eq('is_active', true).limit(1)
  if (!seasons?.length) {
    const { data: s, error: seErr } = await admin.from('seasons').insert({
      name: 'TEST_PB_Season',
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

  // 2. Utenti Genitore 1 e 2
  const roles = [
    { email: ctx.parent1Email, role: 'parent', key: 'parent1Id', name: 'TEST_PB_parent1' },
    { email: ctx.parent2Email, role: 'parent', key: 'parent2Id', name: 'TEST_PB_parent2' },
  ]
  for (const r of roles) {
    const { data, error } = await admin.auth.admin.createUser({ email: r.email, password: PASSWORD, email_confirm: true })
    if (error) throw new Error(`createUser ${r.email}: ${error.message}`)
    ctx[r.key] = data.user.id
    await admin.from('profiles').upsert({ id: data.user.id, email: r.email, full_name: r.name, role: r.role })
  }

  // Helper per inserire giocatori con tutti i campi validi per trg_validate_player_fields
  async function insertPlayer(firstName, taxCode, medicalExpiry = null) {
    const { data: player, error } = await admin.from('players').insert({
      first_name: firstName,
      last_name: 'Test',
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
      email: `${firstName.toLowerCase().replace('_','')}@example.com`,
      phone_player: '3330000000',
      privacy_accepted: true,
      tax_code: taxCode,
      medical_expiry: medicalExpiry,
    }).select('id').single()
    if (error) throw new Error(`createPlayer ${firstName} error: ${error.message}`)
    return player.id
  }

  // 3. Creazione atleti
  ctx.playerConfirmedId = await insertPlayer('TEST_PB_Confirmed', 'RSSMRA80A01F205D', '2026-08-15')
  ctx.playerPendingId = await insertPlayer('TEST_PB_Pending', 'BNCFNC80A01F205A', '2026-09-15')
  ctx.playerOtherId = await insertPlayer('TEST_PB_Other', 'VRDGNN80A01F205O', '2026-10-15')
  ctx.playerNoPaymentsId = await insertPlayer('TEST_PB_NoPayments', 'RSSFNC80A01F205X', null)

  // 4. Associazioni parent_players
  // Genitore 1 ha Confirmed come confermato, Pending come pending, NoPayments come confermato
  await admin.from('parent_players').insert([
    { parent_profile_id: ctx.parent1Id, player_id: ctx.playerConfirmedId, status: 'confirmed' },
    { parent_profile_id: ctx.parent1Id, player_id: ctx.playerPendingId, status: 'pending' },
    { parent_profile_id: ctx.parent1Id, player_id: ctx.playerNoPaymentsId, status: 'confirmed' },
  ])
  // Genitore 2 ha Other come confermato
  await admin.from('parent_players').insert([
    { parent_profile_id: ctx.parent2Id, player_id: ctx.playerOtherId, status: 'confirmed' },
  ])

  // 5. Creazione pagamenti in active season
  // Confirmed: 2 rate, una pagata, una overdue/pending
  await admin.from('payments').insert([
    {
      player_id: ctx.playerConfirmedId,
      season_id: ctx.seasonId,
      installment_no: 1,
      plan: 'installments',
      amount_eur: 200,
      paid_amount_eur: 200,
      status: 'paid',
      due_date: '2026-07-01'
    },
    {
      player_id: ctx.playerConfirmedId,
      season_id: ctx.seasonId,
      installment_no: 2,
      plan: 'installments',
      amount_eur: 150,
      paid_amount_eur: null,
      status: 'pending',
      due_date: '2026-08-01' // Scadrà o risulterà pending
    }
  ])

  // Pending: 1 rata
  await admin.from('payments').insert([
    {
      player_id: ctx.playerPendingId,
      season_id: ctx.seasonId,
      installment_no: 1,
      plan: 'annual',
      amount_eur: 300,
      paid_amount_eur: null,
      status: 'pending',
      due_date: '2026-09-01'
    }
  ])

  // Other: 1 rata pagata
  await admin.from('payments').insert([
    {
      player_id: ctx.playerOtherId,
      season_id: ctx.seasonId,
      installment_no: 1,
      plan: 'annual',
      amount_eur: 350,
      paid_amount_eur: 350,
      status: 'paid',
      due_date: '2026-07-01'
    }
  ])
}

async function runTests() {
  const client1 = await loginAs(ctx.parent1Email)

  // ── Scenario 1: Lettura della stagione attiva ──
  {
    const { data: season, error } = await client1
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single()

    check(
      'Il genitore può leggere direttamente la stagione attiva',
      error === null && season !== null,
      error?.message || `Stagione ID: ${season?.id}`
    )
  }

  // ── Scenario 2: Lettura pagamenti del figlio confermato ──
  {
    const { data: payments, error } = await client1
      .from('payments')
      .select('*')
      .eq('player_id', ctx.playerConfirmedId)

    check(
      'Il genitore legge correttamente i pagamenti del figlio confermato',
      error === null && payments?.length === 2,
      `Trovati ${payments?.length || 0} pagamenti (attesi 2). Err: ${error?.message}`
    )
  }

  // ── Scenario 3: Lettura scadenza medica del figlio confermato ──
  {
    const { data: player, error } = await client1
      .from('players')
      .select('id, medical_expiry')
      .eq('id', ctx.playerConfirmedId)
      .single()

    check(
      'Il genitore legge correttamente la scadenza medica del figlio confermato',
      error === null && player?.medical_expiry === '2026-08-15',
      `Scadenza letta: ${player?.medical_expiry}. Err: ${error?.message}`
    )
  }

  // ── Scenario 4: Isolamento da figlio pending ──
  {
    const { data: payments, error: payErr } = await client1
      .from('payments')
      .select('*')
      .eq('player_id', ctx.playerPendingId)

    check(
      'Il genitore NON può leggere i pagamenti del figlio pending',
      payErr === null && payments?.length === 0,
      `Trovati ${payments?.length || 0} pagamenti (attesi 0). Err: ${payErr?.message}`
    )

    const { data: player, error: playErr } = await client1
      .from('players')
      .select('id, medical_expiry')
      .eq('id', ctx.playerPendingId)

    check(
      'Il genitore NON può leggere i dati del figlio pending',
      playErr === null && player?.length === 0,
      `Trovati ${player?.length || 0} giocatori (attesi 0). Err: ${playErr?.message}`
    )
  }

  // ── Scenario 5: Isolamento da figlio altrui ──
  {
    const { data: payments, error: payErr } = await client1
      .from('payments')
      .select('*')
      .eq('player_id', ctx.playerOtherId)

    check(
      'Il genitore NON può leggere i pagamenti di un figlio altrui',
      payErr === null && payments?.length === 0,
      `Trovati ${payments?.length || 0} pagamenti (attesi 0). Err: ${payErr?.message}`
    )

    const { data: player, error: playErr } = await client1
      .from('players')
      .select('id, medical_expiry')
      .eq('id', ctx.playerOtherId)

    check(
      'Il genitore NON può leggere i dati di un figlio altrui',
      playErr === null && player?.length === 0,
      `Trovati ${player?.length || 0} giocatori (attesi 0). Err: ${playErr?.message}`
    )
  }

  // ── Scenario 6: Caso figlio confermato senza rate ──
  {
    const { data: payments, error } = await client1
      .from('payments')
      .select('*')
      .eq('player_id', ctx.playerNoPaymentsId)

    check(
      'Caso figlio senza rate: query restituisce array vuoto senza errori',
      error === null && payments?.length === 0,
      `Trovati ${payments?.length || 0} pagamenti (attesi 0). Err: ${error?.message}`
    )
  }
}

async function main() {
  console.log('--- AVVIO TEST BILANCIO GENITORE (US-028) ---')
  try {
    await precleanup()
    await setup()
    await runTests()
  } catch (e) {
    console.error('❌ ERRORE FATALE DI SETUP/ESECUZIONE:', e)
    failures++
  } finally {
    try {
      await precleanup()
    } catch (e) {
      console.error('Errore in cleanup final:', e)
    }
  }

  console.log('\n--- RISULTATI ---')
  results.forEach(r => console.log(r))
  console.log(`\nFalliti: ${failures}`)
  process.exit(failures > 0 ? 1 : 0)
}

main()
