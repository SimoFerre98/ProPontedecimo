// Integration test for CHECK constraint and RLS Access Matrix on public.events.
// Esecuzione:  node scripts/test-events.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const randomSuffix = randomBytes(4).toString('hex')
const PASSWORD = `Events!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-events-${role}-${randomSuffix}@propontedecimo.test`

const results = []
let failures = 0

function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function loginAs(role) {
  const client = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({
    email: emailFor(role),
    password: PASSWORD
  })
  if (error) throw new Error(`login ${role}: ${error.message}`)
  return client
}

const ctx = {
  users: {},
  events: []
}

async function precleanup() {
  console.log('Pre-cleanup: removing leftover events and users...')
  await admin.from('events').delete().like('title', 'TEST_EVENTS_%')
  
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-events-') && u.email?.endsWith('@propontedecimo.test')) {
      await admin.from('profiles').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  }
}

async function setupUsers() {
  console.log('\nSetting up test users and profiles...')
  const roles = ['president', 'coach', 'player']
  for (const role of roles) {
    const email = emailFor(role)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true
    })
    if (error) {
      throw new Error(`createUser ${role}: ${error.message}`)
    }
    ctx.users[role] = data.user.id
    
    const { error: profileError } = await admin.from('profiles')
      .upsert({
        id: data.user.id,
        email,
        full_name: `TEST_EVENTS_${role.toUpperCase()}`,
        role
      })
    if (profileError) {
      throw new Error(`profile upsert ${role}: ${profileError.message}`)
    }
    console.log(`Created profile for ${role} with email ${email}`)
  }
}

async function testCheckConstraints() {
  console.log('\n--- Testing CHECK Constraints ---')

  // 1. Attempting to insert an event of type 'home_match' or 'away_match' WITHOUT a meetup_time must FAIL
  for (const type of ['home_match', 'away_match']) {
    const { data, error } = await admin.from('events').insert({
      title: `TEST_EVENTS_${type.toUpperCase()}_FAIL`,
      event_type: type,
      start_date: new Date().toISOString(),
      meetup_time: null
    }).select()

    const isCheckViolation = error && (
      error.message.includes('check_meetup_time') || 
      error.code === '23514' ||
      (error.details && error.details.includes('check_meetup_time'))
    )

    check(
      `Inserting event of type '${type}' WITHOUT meetup_time fails with check constraint violation`,
      !!isCheckViolation,
      error ? `${error.message} (code: ${error.code})` : 'Unexpected success'
    )
  }

  // 2. Attempting to insert an event of type 'home_match' or 'away_match' WITH a meetup_time must SUCCEED
  for (const type of ['home_match', 'away_match']) {
    const { data, error } = await admin.from('events').insert({
      title: `TEST_EVENTS_${type.toUpperCase()}_SUCCESS`,
      event_type: type,
      start_date: new Date().toISOString(),
      meetup_time: new Date().toISOString()
    }).select()

    if (data && data[0]) {
      ctx.events.push(data[0].id)
    }

    check(
      `Inserting event of type '${type}' WITH meetup_time succeeds`,
      !error && data?.length === 1,
      error?.message
    )
  }

  // 3. Attempting to insert an event of type 'training', 'meeting', or 'generic' WITHOUT a meetup_time must SUCCEED
  for (const type of ['training', 'meeting', 'generic']) {
    const { data, error } = await admin.from('events').insert({
      title: `TEST_EVENTS_${type.toUpperCase()}_SUCCESS`,
      event_type: type,
      start_date: new Date().toISOString(),
      meetup_time: null
    }).select()

    if (data && data[0]) {
      ctx.events.push(data[0].id)
    }

    check(
      `Inserting event of type '${type}' WITHOUT meetup_time succeeds`,
      !error && data?.length === 1,
      error?.message
    )
  }
}

async function testRLSMatrix() {
  console.log('\n--- Testing RLS Access Matrix ---')

  // --- PRESIDENT: CRUD completo ---
  {
    console.log('Testing president client...')
    const c = await loginAs('president')

    // Insert
    const { data: inserted, error: insErr } = await c.from('events').insert({
      title: 'TEST_EVENTS_PRESIDENT_CRUD',
      event_type: 'generic',
      start_date: new Date().toISOString(),
      meetup_time: null
    }).select()
    check('President can insert events', !insErr && inserted?.length === 1, insErr?.message)
    const eventId = inserted?.[0]?.id

    if (eventId) {
      ctx.events.push(eventId)

      // Select
      const { data: selected, error: selErr } = await c.from('events').select('*').eq('id', eventId)
      check('President can select events', !selErr && selected?.length === 1, selErr?.message)

      // Update
      const { data: updated, error: updErr } = await c.from('events')
        .update({ description: 'President update' })
        .eq('id', eventId)
        .select()
      check('President can update events', !updErr && updated?.length === 1, updErr?.message)

      // Delete
      const { error: delErr } = await c.from('events').delete().eq('id', eventId)
      check('President can delete events', !delErr, delErr?.message)
    }
    await c.auth.signOut()
  }

  // --- COACH: CRUD completo ---
  {
    console.log('Testing coach client...')
    const c = await loginAs('coach')

    // Insert
    const { data: inserted, error: insErr } = await c.from('events').insert({
      title: 'TEST_EVENTS_COACH_CRUD',
      event_type: 'generic',
      start_date: new Date().toISOString(),
      meetup_time: null
    }).select()
    check('Coach can insert events', !insErr && inserted?.length === 1, insErr?.message)
    const eventId = inserted?.[0]?.id

    if (eventId) {
      ctx.events.push(eventId)

      // Select
      const { data: selected, error: selErr } = await c.from('events').select('*').eq('id', eventId)
      check('Coach can select events', !selErr && selected?.length === 1, selErr?.message)

      // Update
      const { data: updated, error: updErr } = await c.from('events')
        .update({ description: 'Coach update' })
        .eq('id', eventId)
        .select()
      check('Coach can update events', !updErr && updated?.length === 1, updErr?.message)

      // Delete
      const { error: delErr } = await c.from('events').delete().eq('id', eventId)
      check('Coach can delete events', !delErr, delErr?.message)
    }
    await c.auth.signOut()
  }

  // --- PLAYER: BLOCKED (cannot select or insert/update/delete) ---
  {
    console.log('Testing player client (expected blocked)...')
    const c = await loginAs('player')

    // Create a target event via admin first so we can try to select/update/delete it
    const { data: adminEvent, error: adminErr } = await admin.from('events').insert({
      title: 'TEST_EVENTS_ADMIN_FOR_PLAYER',
      event_type: 'generic',
      start_date: new Date().toISOString(),
      meetup_time: null
    }).select()
    if (adminErr || !adminEvent?.[0]) {
      throw new Error(`Failed to insert admin event for player tests: ${adminErr?.message}`)
    }
    const eventId = adminEvent[0].id
    ctx.events.push(eventId)

    // Select
    const { data: selected, error: selErr } = await c.from('events').select('*').eq('id', eventId)
    check(
      'Player is blocked from selecting events (returns 0 rows)',
      !selErr && (selected?.length === 0 || !selected),
      selErr ? selErr.message : `visti ${selected?.length} record`
    )

    // Insert
    const { data: inserted, error: insErr } = await c.from('events').insert({
      title: 'TEST_EVENTS_PLAYER_INSERT',
      event_type: 'generic',
      start_date: new Date().toISOString(),
      meetup_time: null
    }).select()
    const insertBlocked = !!insErr || (inserted?.length === 0 || !inserted)
    check('Player is blocked from inserting events', insertBlocked, insErr?.message || 'Insert succeeded')
    if (inserted?.[0]) {
      ctx.events.push(inserted[0].id)
    }

    // Update
    const { data: updated, error: updErr } = await c.from('events')
      .update({ description: 'Player update attempt' })
      .eq('id', eventId)
      .select()
    const updateBlocked = !!updErr || (updated?.length === 0 || !updated)
    check('Player is blocked from updating events', updateBlocked, updErr ? updErr.message : (updateBlocked ? 'blocked (0 rows updated)' : 'Update succeeded'))

    // Delete
    const { data: deleted, error: delErr } = await c.from('events')
      .delete()
      .eq('id', eventId)
      .select()
    const deleteBlocked = !!delErr || (deleted?.length === 0 || !deleted)
    check('Player is blocked from deleting events', deleteBlocked, delErr ? delErr.message : (deleteBlocked ? 'blocked (0 rows deleted)' : 'Delete succeeded'))

    await c.auth.signOut()
  }
}

async function cleanup() {
  console.log('\nCleaning up test events, profiles, and auth users...')
  if (ctx.events.length > 0) {
    const { error } = await admin.from('events').delete().in('id', ctx.events)
    if (error) console.error('Error cleaning up events:', error.message)
  }
  for (const [role, id] of Object.entries(ctx.users)) {
    const { error: profErr } = await admin.from('profiles').delete().eq('id', id)
    if (profErr) console.error(`Error deleting profile for ${role}:`, profErr.message)
    const { error: authErr } = await admin.auth.admin.deleteUser(id)
    if (authErr) console.error(`Error deleting auth user for ${role}:`, authErr.message)
  }
}

async function run() {
  try {
    await precleanup()
    await setupUsers()
    await testCheckConstraints()
    await testRLSMatrix()
  } catch (err) {
    failures++
    console.error('Fatal test execution error:', err)
  } finally {
    try {
      await cleanup()
    } catch (err) {
      console.error('Error during cleanup phase:', err.message)
    }
  }

  console.log('\n=== TEST SUMMARY: EVENTS CHECK & RLS ===')
  for (const res of results) {
    console.log(res)
  }

  console.log(`\n${failures === 0 ? '🟢 All tests PASSED!' : `🔴 ${failures} test failures occurred.`}`)
  process.exit(failures === 0 ? 0 : 1)
}

run()
