// Integration test for get_financial_trend RPC.
// Esecuzione:  node scripts/test-financial-trend.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `Trend!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-trend-${role}@propontedecimo.test`

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

const ctx = { users: {}, players: [], payments: [] }

async function cleanup() {
  console.log('Cleaning up test data...')
  
  if (ctx.players?.length) {
    const playerIds = ctx.players.map(p => p.id)
    await admin.from('payments').delete().in('player_id', playerIds)
  }
  
  await admin.from('players').delete().like('first_name', 'TEST_TREND%')
  await admin.from('seasons').delete().like('name', 'TEST_TREND%')

  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-trend-') && u.email?.endsWith('@propontedecimo.test')) {
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
    id: presData.user.id, email: emailFor('president'), full_name: 'TEST_TREND_President', role: 'president'
  })
  if (pProfileErr) throw new Error(`president profile: ${pProfileErr.message}`)

  // 2. Create coach user
  const { data: coachData, error: coachErr } = await admin.auth.admin.createUser({
    email: emailFor('coach'), password: PASSWORD, email_confirm: true
  })
  if (coachErr) throw new Error(`create coach: ${coachErr.message}`)
  ctx.users.coach = coachData.user.id

  let { error: cProfileErr } = await admin.from('profiles').upsert({
    id: coachData.user.id, email: emailFor('coach'), full_name: 'TEST_TREND_Coach', role: 'coach'
  })
  if (cProfileErr) throw new Error(`coach profile: ${cProfileErr.message}`)

  // 3. Create test season
  console.log('Setting up test season and player...')
  const { data: season, error: se } = await admin.from('seasons').insert({
    name: 'TEST_TREND_2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', is_active: false
  }).select('id').single()
  if (se) throw new Error(`create season: ${se.message}`)
  ctx.seasonId = season.id

  // 4. Create player
  const baseFields = {
    birth_place: 'Genova', citizenship: 'Italiana',
    address_street: 'Via Test 1', address_city: 'Genova', address_zip: '16100',
    email: 'test.trend@example.com', phone_player: '3331112222',
    privacy_accepted: true,
    parent1_name: 'Genitore Test', parent1_phone: '3339998888'
  }
  const { data: players, error: pe } = await admin.from('players').insert([
    { ...baseFields, first_name: 'TEST_TREND_A', last_name: 'AtletaA', team_sector: 'Pulcini 2015', season_id: ctx.seasonId, birth_date: '2015-05-10', is_active: true, tax_code: 'TRDAAA15E10D969X' }
  ]).select('id')
  if (pe) throw new Error(`create player: ${pe.message}`)
  ctx.players = players
}

async function runTests() {
  console.log('Running tests...')
  
  const clientPresident = await loginAs('president')
  const clientCoach = await loginAs('coach')
  
  // Test 1: Access control
  try {
    const { data, error } = await clientCoach.rpc('get_financial_trend', { p_season_id: ctx.seasonId })
    check('Coach should not be authorized', error && error.code === '42501', `Error code: ${error?.code}`)
  } catch (e) {
    check('Coach call caught error', e.message.includes('42501'), e.message)
  }

  // Test 2: Season with no payments should return empty array / zeros without error
  try {
    const { data, error } = await clientPresident.rpc('get_financial_trend', { p_season_id: ctx.seasonId })
    if (error) throw error
    check('No payments: months is empty array', Array.isArray(data.months) && data.months.length === 0)
    check('No payments: previsto_totale is 0', data.totals.previsto_totale === 0, `val: ${data.totals.previsto_totale}`)
    check('No payments: incassato_totale is 0', data.totals.incassato_totale === 0, `val: ${data.totals.incassato_totale}`)
    check('No payments: insoluti_recuperati is 0', data.totals.insoluti_recuperati === 0)
    check('No payments: rate_future_residue is 0', data.totals.rate_future_residue === 0)
  } catch (e) {
    check('No payments: execution failed', false, e.message)
  }

  // Create test payments
  console.log('Inserting test payments...')
  
  // Future date for future installment (30 days from now)
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const futureDateStr = futureDate.toISOString().split('T')[0]
  
  // We will insert 4 payments:
  // 1. Paid quota: amount 100, paid 100, plan 'annual', due 2026-09-15
  // 2. Paid quota (installments): amount 120, paid 120, plan 'installments', due 2026-10-15
  // 3. Paid insoluti: amount 50, paid 50, plan 'carried_over', due 2026-10-15
  // 4. Future unpaid: amount 150, paid 0, plan 'installments', due futureDateStr (pending)
  
  const testPayments = [
    {
      player_id: ctx.players[0].id,
      season_id: ctx.seasonId,
      installment_no: 1,
      amount_eur: 100,
      paid_amount_eur: 100,
      status: 'paid',
      plan: 'annual',
      due_date: '2026-09-15'
    },
    {
      player_id: ctx.players[0].id,
      season_id: ctx.seasonId,
      installment_no: 2,
      amount_eur: 120,
      paid_amount_eur: 120,
      status: 'paid',
      plan: 'installments',
      due_date: '2026-10-15'
    },
    {
      player_id: ctx.players[0].id,
      season_id: ctx.seasonId,
      installment_no: 3,
      amount_eur: 50,
      paid_amount_eur: 50,
      status: 'paid',
      plan: 'carried_over',
      due_date: '2026-10-15'
    },
    {
      player_id: ctx.players[0].id,
      season_id: ctx.seasonId,
      installment_no: 4,
      amount_eur: 150,
      paid_amount_eur: 0,
      status: 'pending',
      plan: 'installments',
      due_date: futureDateStr
    }
  ]
  
  const { error: insErr } = await admin.from('payments').insert(testPayments)
  if (insErr) throw new Error(`insert payments: ${insErr.message}`)

  // Test 3: Standard financial trend calculations
  try {
    const { data, error } = await clientPresident.rpc('get_financial_trend', { p_season_id: ctx.seasonId })
    if (error) throw error
    
    // Totals calculations
    // previsto_totale = 100 + 120 + 50 + 150 = 420
    // incassato_totale = 100 + 120 + 50 = 270
    // insoluti_recuperati = 50
    // rate_future_residue = 150 (since futureDateStr is in the future)
    check('Totals: previsto_totale is correct', Number(data.totals.previsto_totale) === 420, `expected 420, got ${data.totals.previsto_totale}`)
    check('Totals: incassato_totale is correct', Number(data.totals.incassato_totale) === 270, `expected 270, got ${data.totals.incassato_totale}`)
    check('Totals: insoluti_recuperati is correct', Number(data.totals.insoluti_recuperati) === 50, `expected 50, got ${data.totals.insoluti_recuperati}`)
    check('Totals: rate_future_residue is correct', Number(data.totals.rate_future_residue) === 150, `expected 150, got ${data.totals.rate_future_residue}`)

    // Months calculations
    // 2026-09: previsto 100, incassato quota 100, incassato insoluti 0
    // 2026-10: previsto 120 + 50 = 170, incassato quota 120, incassato insoluti 50
    // future month: previsto 150, incassato quota 0, incassato insoluti 0
    
    check('Months: contains correct number of months', data.months.length === 3, `got ${data.months.length}`)
    
    const mSep = data.months.find(m => m.month === '2026-09')
    check('Month 2026-09: exists', !!mSep)
    if (mSep) {
      check('Month 2026-09: previsto is 100', Number(mSep.previsto_eur) === 100, `got ${mSep.previsto_eur}`)
      check('Month 2026-09: incassato_quota is 100', Number(mSep.incassato_quota_eur) === 100, `got ${mSep.incassato_quota_eur}`)
      check('Month 2026-09: incassato_insoluti is 0', Number(mSep.incassato_insoluti_eur) === 0, `got ${mSep.incassato_insoluti_eur}`)
    }

    const mOct = data.months.find(m => m.month === '2026-10')
    check('Month 2026-10: exists', !!mOct)
    if (mOct) {
      // previsto = 120 + 50 = 170
      check('Month 2026-10: previsto is 170', Number(mOct.previsto_eur) === 170, `got ${mOct.previsto_eur}`)
      check('Month 2026-10: incassato_quota is 120', Number(mOct.incassato_quota_eur) === 120, `got ${mOct.incassato_quota_eur}`)
      check('Month 2026-10: incassato_insoluti is 50', Number(mOct.incassato_insoluti_eur) === 50, `got ${mOct.incassato_insoluti_eur}`)
    }

    const futureMonthStr = futureDateStr.substring(0, 7)
    const mFuture = data.months.find(m => m.month === futureMonthStr)
    check(`Month ${futureMonthStr}: exists`, !!mFuture)
    if (mFuture) {
      check(`Month ${futureMonthStr}: previsto is 150`, Number(mFuture.previsto_eur) === 150, `got ${mFuture.previsto_eur}`)
      check(`Month ${futureMonthStr}: incassato_quota is 0`, Number(mFuture.incassato_quota_eur) === 0, `got ${mFuture.incassato_quota_eur}`)
      check(`Month ${futureMonthStr}: incassato_insoluti is 0`, Number(mFuture.incassato_insoluti_eur) === 0, `got ${mFuture.incassato_insoluti_eur}`)
    }

  } catch (e) {
    check('Calculations: execution failed', false, e.message)
  }
}

async function main() {
  try {
    await cleanup()
    await setup()
    await runTests()
  } catch (err) {
    console.error('Fatal test error:', err)
    failures++
  } finally {
    await cleanup()
  }
  
  console.log('\nResults:')
  console.log(results.join('\n'))
  
  if (failures > 0) {
    console.log(`\n❌ Finished with ${failures} failure(s)`)
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  }
}

main()
