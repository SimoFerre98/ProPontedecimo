// Integration test for inventory_items (inventoryService: getInventory, addItem, updateQuantity) + RLS.
// Esecuzione:  node scripts/test-inventory.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL_ = 'http://127.0.0.1:54321'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const PASSWORD = `Inventory!${randomBytes(24).toString('base64url')}`
const emailFor = (role) => `test-inventory-${role}@propontedecimo.test`

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

const ctx = { users: {}, itemIds: [] }

async function cleanup() {
  console.log('Cleaning up test data...')

  // Rimuovi articoli inventario di test
  await admin.from('inventory_items').delete().like('name', 'TEST_INV%')

  // Rimuovi utenti di test
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('test-inventory-') && u.email?.endsWith('@propontedecimo.test')) {
      await admin.from('profiles').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  }

  ctx.itemIds = []
}

async function setup() {
  console.log('Setting up test users and profiles...')

  // 1. Create president user (authorized: full access)
  const { data: presData, error: presErr } = await admin.auth.admin.createUser({
    email: emailFor('president'), password: PASSWORD, email_confirm: true
  })
  if (presErr) throw new Error(`create president: ${presErr.message}`)
  ctx.users.president = presData.user.id

  const { error: pProfileErr } = await admin.from('profiles').upsert({
    id: presData.user.id, email: emailFor('president'), full_name: 'TEST_INV_President', role: 'president'
  })
  if (pProfileErr) throw new Error(`president profile: ${pProfileErr.message}`)

  // 2. Create director user (authorized: full access)
  const { data: dirData, error: dirErr } = await admin.auth.admin.createUser({
    email: emailFor('director'), password: PASSWORD, email_confirm: true
  })
  if (dirErr) throw new Error(`create director: ${dirErr.message}`)
  ctx.users.director = dirData.user.id

  const { error: dProfileErr } = await admin.from('profiles').upsert({
    id: dirData.user.id, email: emailFor('director'), full_name: 'TEST_INV_Director', role: 'director'
  })
  if (dProfileErr) throw new Error(`director profile: ${dProfileErr.message}`)

  // 3. Create coach user (read-only: SELECT only per inventory_select_coach)
  const { data: coachData, error: coachErr } = await admin.auth.admin.createUser({
    email: emailFor('coach'), password: PASSWORD, email_confirm: true
  })
  if (coachErr) throw new Error(`create coach: ${coachErr.message}`)
  ctx.users.coach = coachData.user.id

  const { error: cProfileErr } = await admin.from('profiles').upsert({
    id: coachData.user.id, email: emailFor('coach'), full_name: 'TEST_INV_Coach', role: 'coach'
  })
  if (cProfileErr) throw new Error(`coach profile: ${cProfileErr.message}`)
}

// Replica la query di inventoryService.getInventory
async function getInventory(client, search, category, page = 0, pageSize = 10) {
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('inventory_items')
    .select('*', { count: 'exact' })
    .order('name')
    .range(from, to)

  if (search) query = query.ilike('name', `%${search}%`)
  if (category && category !== 'all') query = query.eq('category', category)

  return query
}

// Replica la query di inventoryService.addItem
async function addItem(client, item) {
  return client.from('inventory_items').insert([item]).select().single()
}

// Replica la query di inventoryService.updateQuantity
async function updateQuantity(client, id, quantity) {
  return client
    .from('inventory_items')
    .update({ quantity, last_update: new Date().toISOString() })
    .eq('id', id)
}

async function runTests() {
  await cleanup()
  await setup()

  console.log('Running tests...')

  // CASE 1: addItem (president) - insert con tutte le colonne, incluse unit e min_stock
  let seededItem
  try {
    const presClient = await loginAs('president')
    const { data, error } = await addItem(presClient, {
      name: 'TEST_INV_Palloni',
      category: 'attrezzatura',
      quantity: 12,
      unit: 'pz',
      min_stock: 3,
    })
    check('addItem - President can insert item', !error, error?.message)
    check('addItem - Row has correct name/category/quantity', data?.name === 'TEST_INV_Palloni' && data?.category === 'attrezzatura' && data?.quantity === 12)
    check('addItem - Row has correct unit', data?.unit === 'pz', `Got: ${data?.unit}`)
    check('addItem - Row has correct min_stock', data?.min_stock === 3, `Got: ${data?.min_stock}`)
    check('addItem - Row has last_update populated', !!data?.last_update, `Got: ${data?.last_update}`)
    seededItem = data
    if (seededItem?.id) ctx.itemIds.push(seededItem.id)
  } catch (err) {
    check('addItem - President insert error catch', false, err.message)
  }

  // CASE 2: addItem (director) - anche il director può inserire
  try {
    const dirClient = await loginAs('director')
    const { data, error } = await addItem(dirClient, {
      name: 'TEST_INV_Coni',
      category: 'attrezzatura',
      quantity: 40,
      unit: 'set',
      min_stock: 5,
    })
    check('addItem - Director can insert item', !error, error?.message)
    if (data?.id) ctx.itemIds.push(data.id)
  } catch (err) {
    check('addItem - Director insert error catch', false, err.message)
  }

  // CASE 3: addItem (coach) - il coach non può inserire (solo SELECT)
  try {
    const coachClient = await loginAs('coach')
    const { data, error } = await addItem(coachClient, {
      name: 'TEST_INV_Should_Not_Exist',
      category: 'other',
      quantity: 1,
      unit: 'pz',
      min_stock: 1,
    })
    // RLS su USING (senza WITH CHECK esplicito) rifiuta la insert: niente riga restituita o errore di policy
    check('RLS - Coach cannot insert item', !!error || !data, `error: ${error?.message}, data: ${JSON.stringify(data)}`)
    // Verifica lato admin che la riga non sia stata effettivamente creata
    const { data: verifyRows } = await admin.from('inventory_items').select('id').eq('name', 'TEST_INV_Should_Not_Exist')
    check('RLS - Coach insert did not persist any row', (verifyRows?.length ?? 0) === 0)
  } catch (err) {
    // Un errore di permesso è un esito atteso, non un fallimento del test
    check('RLS - Coach insert rejected (exception)', true, err.message)
  }

  // Seed di un secondo articolo con nome distintivo per i filtri di ricerca/categoria
  let secondItem
  try {
    const presClient = await loginAs('president')
    const { data, error } = await addItem(presClient, {
      name: 'TEST_INV_Maglie_Gara',
      category: 'divise',
      quantity: 25,
      unit: 'pz',
      min_stock: 10,
    })
    if (error) throw new Error(error.message)
    secondItem = data
    if (secondItem?.id) ctx.itemIds.push(secondItem.id)
  } catch (err) {
    check('Setup - Second seed item created', false, err.message)
  }

  // CASE 4: getInventory - restituisce gli articoli inseriti
  try {
    const presClient = await loginAs('president')
    const { data, error, count } = await getInventory(presClient, undefined, undefined, 0, 50)
    check('getInventory - No error on plain listing', !error, error?.message)
    const names = (data ?? []).map(r => r.name)
    check('getInventory - Contains seeded items', names.includes('TEST_INV_Palloni') && names.includes('TEST_INV_Coni') && names.includes('TEST_INV_Maglie_Gara'), `Names: ${names.join(', ')}`)
    check('getInventory - Count reflects at least seeded rows', (count ?? 0) >= 3, `Count: ${count}`)
  } catch (err) {
    check('getInventory - Plain listing error catch', false, err.message)
  }

  // CASE 5: getInventory - filtro search (ilike su name)
  try {
    const presClient = await loginAs('president')
    const { data, error } = await getInventory(presClient, 'Maglie', undefined, 0, 50)
    check('getInventory - Search filter no error', !error, error?.message)
    check('getInventory - Search filter returns only matching item', (data?.length ?? 0) === 1 && data[0]?.name === 'TEST_INV_Maglie_Gara', `Got: ${JSON.stringify(data?.map(r => r.name))}`)
  } catch (err) {
    check('getInventory - Search filter error catch', false, err.message)
  }

  // CASE 6: getInventory - filtro category
  try {
    const presClient = await loginAs('president')
    const { data, error } = await getInventory(presClient, undefined, 'divise', 0, 50)
    check('getInventory - Category filter no error', !error, error?.message)
    const names = (data ?? []).map(r => r.name)
    check('getInventory - Category filter returns only matching item', names.length === 1 && names.includes('TEST_INV_Maglie_Gara'), `Got: ${names.join(', ')}`)
    check('getInventory - Category filter excludes other categories', !names.includes('TEST_INV_Palloni') && !names.includes('TEST_INV_Coni'))
  } catch (err) {
    check('getInventory - Category filter error catch', false, err.message)
  }

  // CASE 7: updateQuantity (president) - aggiorna quantity e last_update
  try {
    if (!seededItem?.id) throw new Error('seeded item missing, cannot test updateQuantity')
    const before = await admin.from('inventory_items').select('quantity, last_update').eq('id', seededItem.id).single()

    // Piccola attesa per garantire che il nuovo timestamp sia strettamente successivo
    await new Promise(resolve => setTimeout(resolve, 1100))

    const presClient = await loginAs('president')
    const { error } = await updateQuantity(presClient, seededItem.id, 7)
    check('updateQuantity - President can update quantity', !error, error?.message)

    const after = await admin.from('inventory_items').select('quantity, last_update').eq('id', seededItem.id).single()
    check('updateQuantity - Quantity updated to new value', after.data?.quantity === 7, `Got: ${after.data?.quantity}`)
    check('updateQuantity - last_update bumped', new Date(after.data?.last_update).getTime() > new Date(before.data?.last_update).getTime(), `Before: ${before.data?.last_update}, After: ${after.data?.last_update}`)
  } catch (err) {
    check('updateQuantity - President update error catch', false, err.message)
  }

  // CASE 8: RLS - il coach può leggere (SELECT) ma non aggiornare (UPDATE)
  try {
    const coachClient = await loginAs('coach')
    const { data: readData, error: readErr } = await getInventory(coachClient, undefined, undefined, 0, 50)
    check('RLS - Coach can read inventory', !readErr && (readData?.length ?? 0) > 0, readErr?.message)

    if (!seededItem?.id) throw new Error('seeded item missing, cannot test coach update denial')
    const beforeUpdate = await admin.from('inventory_items').select('quantity').eq('id', seededItem.id).single()

    const { data: updData, error: updErr } = await coachClient
      .from('inventory_items')
      .update({ quantity: 999, last_update: new Date().toISOString() })
      .eq('id', seededItem.id)
      .select()

    check('RLS - Coach update denied (no rows affected / error)', !!updErr || (updData?.length ?? 0) === 0, `error: ${updErr?.message}, rows: ${JSON.stringify(updData)}`)

    const afterUpdate = await admin.from('inventory_items').select('quantity').eq('id', seededItem.id).single()
    check('RLS - Coach update did not persist', afterUpdate.data?.quantity === beforeUpdate.data?.quantity, `Before: ${beforeUpdate.data?.quantity}, After: ${afterUpdate.data?.quantity}`)
  } catch (err) {
    check('RLS - Coach read/update error catch', false, err.message)
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
