// Test di integrazione per la creazione di task e la lettura del calendario con timezone.
// Esecuzione: node scripts/test-calendar-timezone.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tsPath = path.join(__dirname, '../src/lib/dateTime.ts')
const tsCode = fs.readFileSync(tsPath, 'utf8')

// Clean TS type annotations to make it valid JS
const jsCode = tsCode
  .replace(/:\s*\{\s*date:\s*string;\s*time:\s*string\s*\}/g, '')
  .replace(/:\s*string\s*\|\s*null/g, '')
  .replace(/:\s*string/g, '')
  .replace(/:\s*string\s*\[\s*\]/g, '')

const tempJsPath = path.join(__dirname, 'temp-dateTime-timezone.mjs')

let combineLocalDateTime, splitLocalDateTime
try {
  fs.writeFileSync(tempJsPath, jsCode, 'utf8')
  const module = await import('./temp-dateTime-timezone.mjs')
  combineLocalDateTime = module.combineLocalDateTime
  splitLocalDateTime = module.splitLocalDateTime
} finally {
  if (fs.existsSync(tempJsPath)) {
    fs.unlinkSync(tempJsPath)
  }
}

console.log('Avvio test di integrazione per creazione task e lettura calendario...')

// Connessione a Supabase locale
const URL_ = 'http://127.0.0.1:54321'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

let failures = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Asserzione FALLITA: ${message}`)
    failures++
    return false
  }
  return true
}

async function runTest() {
  let profileId = null
  let createdTestUser = false
  
  // Try to find an existing profile first
  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .limit(1)

  if (profiles && profiles.length > 0) {
    profileId = profiles[0].id
    console.log(`Profilo esistente utilizzato come autore (created_by): ${profileId}`)
  } else {
    // Create a temporary test user
    console.log('Nessun profilo esistente. Creazione di un utente di test temporaneo in auth...')
    const testEmail = `test-tz-${Date.now()}@propontedecimo.test`
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: 'Password123!',
      email_confirm: true
    })
    
    if (userErr) {
      console.error('❌ Errore creando utente di test:', userErr.message)
      process.exit(1)
    }
    
    profileId = userData.user.id
    createdTestUser = true
    console.log(`Profilo temporaneo creato con ID: ${profileId}`)
  }

  // 4. Test di integrazione
  const testDate = "2026-03-15"
  const testTime = "18:00"
  const testTitle = "Task di test Integrazione Calendario"
  const testDescription = "Test per verificare il fuso orario"

  // combineLocalDateTime per ottenere la stringa ISO
  const combinedIso = combineLocalDateTime(testDate, testTime)
  if (!assert(combinedIso !== null, 'combineLocalDateTime non dovrebbe restituire null')) {
    process.exit(1)
  }

  console.log(`Combinazione data/ora locale: "${testDate} ${testTime}" -> ISO UTC: "${combinedIso}"`)

  let insertedTaskId = null
  try {
    // Inserisce il task nel database
    const { data: insertedTask, error: insertErr } = await admin
      .from('staff_tasks')
      .insert({
        title: testTitle,
        description: testDescription,
        start_date: combinedIso,
        created_by: profileId,
        status: 'todo'
      })
      .select()
      .single()

    if (insertErr) {
      console.error('❌ Errore durante l\'inserimento del task:', insertErr.message)
      failures++
      return
    }

    insertedTaskId = insertedTask.id
    console.log(`Task inserito correttamente con ID: ${insertedTaskId}`)

    // Recupera il task da staff_tasks
    const { data: retrievedTask, error: retrieveErr } = await admin
      .from('staff_tasks')
      .select('*')
      .eq('id', insertedTaskId)
      .single()

    if (retrieveErr) {
      console.error('❌ Errore durante il recupero del task inserito:', retrieveErr.message)
      failures++
      return
    }

    console.log(`Task recuperato. start_date salvata sul DB: "${retrievedTask.start_date}"`)

    // Call splitLocalDateTime on the retrieved start_date
    const split = splitLocalDateTime(retrievedTask.start_date)
    console.log(`splitLocalDateTime su start_date recuperata -> data: "${split.date}", ora: "${split.time}"`)

    // Assert that it correctly returns the original local date "2026-03-15" and time "18:00"
    assert(split.date === testDate, `Data attesa: "${testDate}", ottenuta: "${split.date}"`)
    assert(split.time === testTime, `Ora attesa: "${testTime}", ottenuta: "${split.time}"`)

    // Simulate the calendar service event mapping
    const timeStr = retrievedTask.start_date.includes('T') 
      ? splitLocalDateTime(retrievedTask.start_date).time
      : null

    const displayTitle = timeStr ? `${timeStr} - ${retrievedTask.title}` : retrievedTask.title

    // Assert timeStr is parsed as "18:00"
    assert(timeStr === testTime, `Orario dell'evento atteso: "${testTime}", ottenuto: "${timeStr}"`)

    // Assert display title is "18:00 - <title>"
    const expectedDisplayTitle = `${testTime} - ${testTitle}`
    assert(displayTitle === expectedDisplayTitle, `Titolo visualizzato atteso: "${expectedDisplayTitle}", ottenuto: "${displayTitle}"`)

  } catch (err) {
    console.error('❌ Eccezione durante l\'esecuzione del test:', err)
    failures++
  } finally {
    if (insertedTaskId) {
      console.log(`Pulizia del task con ID: ${insertedTaskId}...`)
      const { error: deleteErr } = await admin
        .from('staff_tasks')
        .delete()
        .eq('id', insertedTaskId)
      
      if (deleteErr) {
        console.error('❌ Errore durante la rimozione del task:', deleteErr.message)
      } else {
        console.log('✅ Task rimosso con successo.')
      }
    }

    if (createdTestUser && profileId) {
      console.log(`Rimozione dell'utente temporaneo con ID: ${profileId}...`)
      await admin.auth.admin.deleteUser(profileId)
      await admin.from('profiles').delete().eq('id', profileId)
      console.log('✅ Utente temporaneo rimosso.')
    }
  }
}

runTest().then(() => {
  console.log(`\nEsito dei test: ${failures === 0 ? 'Tutti superati!' : `${failures} fallimenti.`}`)
  if (failures > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}).catch(err => {
  console.error('❌ Errore irreversibile del test runner:', err)
  process.exit(1)
})
