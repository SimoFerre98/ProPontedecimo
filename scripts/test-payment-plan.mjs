// Integration test for create_payment_plan RPC.
// Esecuzione:  node scripts/test-payment-plan.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `Payment!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-payment-${role}@propontedecimo.test`

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
  
  // Rimuovi pagamenti di test prima
  if (ctx.players?.length) {
    const playerIds = ctx.players.map(p => p.id)
    await admin.from('payments').delete().in('player_id', playerIds)
  }
  
  // Rimuovi giocatori di test
  await admin.from('players').delete().like('first_name', 'TEST_PAYMENT%')

  // Rimuovi stagioni di test
  await admin.from('seasons').delete().like('name', 'TEST_PAYMENT%')

  // Rimuovi utenti di test
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-payment-') && u.email?.endsWith('@propontedecimo.test')) {
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
    id: presData.user.id, email: emailFor('president'), full_name: 'TEST_PAYMENT_President', role: 'president'
  })
  if (pProfileErr) throw new Error(`president profile: ${pProfileErr.message}`)

  // 2. Create coach user (unauthorized role)
  const { data: coachData, error: coachErr } = await admin.auth.admin.createUser({
    email: emailFor('coach'), password: PASSWORD, email_confirm: true
  })
  if (coachErr) throw new Error(`create coach: ${coachErr.message}`)
  ctx.users.coach = coachData.user.id

  let { error: cProfileErr } = await admin.from('profiles').upsert({
    id: coachData.user.id, email: emailFor('coach'), full_name: 'TEST_PAYMENT_Coach', role: 'coach'
  })
  if (cProfileErr) throw new Error(`coach profile: ${cProfileErr.message}`)

  // 3. Create test season
  console.log('Setting up test season and player...')
  const { data: season, error: se } = await admin.from('seasons').insert({
    name: 'TEST_PAYMENT_2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', is_active: false
  }).select('id').single()
  if (se) throw new Error(`create season: ${se.message}`)
  ctx.seasonId = season.id

  // 4. Create player
  const baseFields = {
    birth_place: 'Genova', citizenship: 'Italiana',
    address_street: 'Via Test 1', address_city: 'Genova', address_zip: '16100',
    email: 'test.payment@example.com', phone_player: '3331112222',
    privacy_accepted: true,
    parent1_name: 'Genitore Test', parent1_phone: '3339998888'
  }
  const { data: players, error: pe } = await admin.from('players').insert([
    { ...baseFields, first_name: 'TEST_PAYMENT_A', last_name: 'Player1', team_sector: 'Pulcini 2016', season_id: ctx.seasonId, birth_date: '2016-05-15', is_active: true, figc_registration: 'FIGC123', is_registered: true, tax_code: 'PLYAAA16E15D969A' }
  ]).select('id, first_name').single()
  if (pe) throw new Error(`create player: ${pe.message}`)
  ctx.players = [players]
}

async function runTests() {
  await cleanup()
  await setup()

  console.log('Running tests...')

  const player = ctx.players[0]
  const seasonId = ctx.seasonId

  // CASE 1: Authorization Failure (Coach cannot invoke the RPC)
  try {
    const coachClient = await loginAs('coach')
    const { error } = await coachClient.rpc('create_payment_plan', {
      p_player_id: player.id,
      p_season_id: seasonId,
      p_total_amount: 300,
      p_installments: [{ amount_eur: 300, due_date: '2026-09-15' }]
    })
    check('Authorization - Coach cannot create payment plan', !!error && error.code === '42501', `Expected error 42501, got ${error?.code}: ${error?.message}`)
  } catch (err) {
    check('Authorization - Coach error catch', false, err.message)
  }

  // CASE 2: Validation - Empty installments
  try {
    const presClient = await loginAs('president')
    const { error } = await presClient.rpc('create_payment_plan', {
      p_player_id: player.id,
      p_season_id: seasonId,
      p_total_amount: 300,
      p_installments: []
    })
    check('Validation - Empty installments list rejected', !!error && error.code === '22023', `Expected error 22023, got ${error?.code}: ${error?.message}`)
  } catch (err) {
    check('Validation - Empty installments error catch', false, err.message)
  }

  // CASE 3: Validation - Installment with amount <= 0 or invalid date
  try {
    const presClient = await loginAs('president')
    const { error: err1 } = await presClient.rpc('create_payment_plan', {
      p_player_id: player.id,
      p_season_id: seasonId,
      p_total_amount: 300,
      p_installments: [{ amount_eur: -50, due_date: '2026-09-15' }]
    })
    check('Validation - Negative amount rejected', !!err1 && err1.code === '22023', `Expected error 22023, got ${err1?.code}: ${err1?.message}`)

    const { error: err2 } = await presClient.rpc('create_payment_plan', {
      p_player_id: player.id,
      p_season_id: seasonId,
      p_total_amount: 300,
      p_installments: [{ amount_eur: 300, due_date: null }]
    })
    check('Validation - Null due_date rejected', !!err2 && err2.code === '22023', `Expected error 22023, got ${err2?.code}: ${err2?.message}`)
  } catch (err) {
    check('Validation - Installment validation error catch', false, err.message)
  }

  // CASE 4: Validation - Sum mismatch
  try {
    const presClient = await loginAs('president')
    const { error } = await presClient.rpc('create_payment_plan', {
      p_player_id: player.id,
      p_season_id: seasonId,
      p_total_amount: 300,
      p_installments: [
        { amount_eur: 150, due_date: '2026-09-15' },
        { amount_eur: 140, due_date: '2027-01-15' } // sum = 290
      ]
    })
    check('Validation - Sum mismatch rejected', !!error && error.code === '22023', `Expected error 22023, got ${error?.code}: ${error?.message}`)
  } catch (err) {
    check('Validation - Sum mismatch error catch', false, err.message)
  }

  // CASE 5: Success - Create 3 installments
  try {
    const presClient = await loginAs('president')
    const { error } = await presClient.rpc('create_payment_plan', {
      p_player_id: player.id,
      p_season_id: seasonId,
      p_total_amount: 300,
      p_installments: [
        { amount_eur: 100, due_date: '2026-09-15' },
        { amount_eur: 100, due_date: '2026-11-15' },
        { amount_eur: 100, due_date: '2027-01-15' }
      ]
    })
    check('Success - Create 3 installments plan', !error, error?.message)

    // Verify written rows
    const { data, error: selectErr } = await admin.from('payments')
      .select('*')
      .eq('player_id', player.id)
      .eq('season_id', seasonId)
      .order('installment_no')
    
    check('Verify - Found exactly 3 rows', !selectErr && data?.length === 3, `Count: ${data?.length}`)
    if (data?.length === 3) {
      check('Verify - Row 1 attributes', data[0].installment_no === 1 && data[0].amount_eur === 100 && data[0].plan === 'installments' && data[0].status === 'pending')
      check('Verify - Row 2 attributes', data[1].installment_no === 2 && data[1].amount_eur === 100 && data[1].plan === 'installments' && data[1].status === 'pending')
      check('Verify - Row 3 attributes', data[2].installment_no === 3 && data[2].amount_eur === 100 && data[2].plan === 'installments' && data[2].status === 'pending')
    }
  } catch (err) {
    check('Success - 3 installments error catch', false, err.message)
  }

  // CASE 6: Success - Overwrite with single installment plan (annual)
  try {
    const presClient = await loginAs('president')
    const { error } = await presClient.rpc('create_payment_plan', {
      p_player_id: player.id,
      p_season_id: seasonId,
      p_total_amount: 300,
      p_installments: [
        { amount_eur: 300, due_date: '2026-09-15' }
      ]
    })
    check('Success - Overwrite with single installment plan', !error, error?.message)

    // Verify overwritten rows
    const { data, error: selectErr } = await admin.from('payments')
      .select('*')
      .eq('player_id', player.id)
      .eq('season_id', seasonId)
    
    check('Verify - Found exactly 1 row', !selectErr && data?.length === 1, `Count: ${data?.length}`)
    if (data?.length === 1) {
      check('Verify - Row 1 attributes after overwrite', data[0].installment_no === 1 && data[0].amount_eur === 300 && data[0].plan === 'annual' && data[0].status === 'pending')
    }
  } catch (err) {
    check('Success - Overwrite error catch', false, err.message)
  }

  // CASE 7: Block - Overwrite not allowed if any installment is paid
  try {
    const presClient = await loginAs('president')
    
    // First, let's mark the only installment as paid
    const { data: currentPayments } = await admin.from('payments')
      .select('id')
      .eq('player_id', player.id)
      .eq('season_id', seasonId)
    
    if (currentPayments?.length === 1) {
      await admin.from('payments').update({ status: 'paid', paid_amount_eur: 300 }).eq('id', currentPayments[0].id)
      
      const { error } = await presClient.rpc('create_payment_plan', {
        p_player_id: player.id,
        p_season_id: seasonId,
        p_total_amount: 300,
        p_installments: [
          { amount_eur: 150, due_date: '2026-09-15' },
          { amount_eur: 150, due_date: '2027-01-15' }
        ]
      })
      check('Block - Overwrite blocked when status is paid', !!error && error.code === '22000', `Expected error 22000, got ${error?.code}: ${error?.message}`)
    } else {
      check('Block - Setup failed, installment not found', false)
    }
  } catch (err) {
    check('Block - paid check error catch', false, err.message)
  }

  // Print results
  console.log('\n--- TEST RESULTS ---')
  for (const r of results) {
    console.log(r)
  }
  console.log('--------------------\n')

  await cleanup()
  
  if (failures > 0) {
    console.error(`Test suite failed with ${failures} failures.`)
    process.exit(1)
  } else {
    console.log('All tests passed successfully!')
    process.exit(0)
  }
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err)
  process.exit(1)
})
