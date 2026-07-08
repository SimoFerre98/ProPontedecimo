// Script di test per verificare il corretto round-trip degli helper dateTime
// in src/lib/dateTime.ts per la conversione data/ora tra timezone locale e UTC.
// Esecuzione: node scripts/test-datetime-helpers.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tsPath = path.join(__dirname, '../src/lib/dateTime.ts')
const tsCode = fs.readFileSync(tsPath, 'utf8')

// Clean TS type annotations to make it valid JS
const jsCode = tsCode
  .replace(/:\s*\{\s*date:\s*string;\s*time:\s*string\s*\}/g, '')
  .replace(/:\s*string\s*\|\s*null/g, '')
  .replace(/:\s*string/g, '')
  .replace(/:\s*string\s*\[\s*\]/g, '')

const tempJsPath = path.join(__dirname, 'temp-dateTime.mjs')

let combineLocalDateTime, splitLocalDateTime
try {
  fs.writeFileSync(tempJsPath, jsCode, 'utf8')
  const module = await import('./temp-dateTime.mjs')
  combineLocalDateTime = module.combineLocalDateTime
  splitLocalDateTime = module.splitLocalDateTime
} finally {
  if (fs.existsSync(tempJsPath)) {
    fs.unlinkSync(tempJsPath)
  }
}

console.log('Avvio test per gli helper datetime in src/lib/dateTime.ts...')

let failures = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Asserzione FALLITA: ${message}`)
    failures++
    return false
  }
  return true
}

function testRoundTrip(date, time, expectedDate, expectedTime) {
  const combined = combineLocalDateTime(date, time)
  if (combined === null) {
    console.error(`❌ combineLocalDateTime(${date}, ${time}) ha restituito null inaspettatamente`)
    failures++
    return
  }
  const split = splitLocalDateTime(combined)
  const ok1 = assert(split.date === expectedDate, `Data attesa: ${expectedDate}, ottenuta: ${split.date} (input: ${date} ${time})`)
  const ok2 = assert(split.time === expectedTime, `Ora attesa: ${expectedTime}, ottenuta: ${split.time} (input: ${date} ${time})`)
  if (ok1 && ok2) {
    console.log(`✅ Successo Round-trip: "${date} ${time}" -> "${combined}" -> "${split.date} ${split.time}"`)
  }
}

// 1. Mezzanotte ("00:00")
testRoundTrip("2026-07-08", "00:00", "2026-07-08", "00:00")

// 2. Pomeriggio ("18:00")
testRoundTrip("2026-07-08", "18:00", "2026-07-08", "18:00")

// 3. Tarda sera ("23:30")
testRoundTrip("2026-07-08", "23:30", "2026-07-08", "23:30")

// 4. Edge cases: fine mese (es. "2026-03-31" alle "23:59")
testRoundTrip("2026-03-31", "23:59", "2026-03-31", "23:59")

// 5. Edge cases: anno bisestile (es. "2028-02-29" alle "12:00")
testRoundTrip("2028-02-29", "12:00", "2028-02-29", "12:00")

// 6. Fallback orario vuoto: "" -> deve usare "00:00"
testRoundTrip("2026-07-08", "", "2026-07-08", "00:00")

// 7. Valori di data vuoti
{
  const combined = combineLocalDateTime("", "12:00")
  assert(combined === null, `combineLocalDateTime con data vuota deve restituire null. Ottenuto: ${combined}`)
}

// 8. Formati non validi
{
  const combined = combineLocalDateTime("not-a-date", "12:00")
  assert(combined === null, `combineLocalDateTime con data non valida deve restituire null. Ottenuto: ${combined}`)
}
{
  const combined = combineLocalDateTime("2026-07-08", "invalid-time")
  assert(combined === null, `combineLocalDateTime con orario non valido deve restituire null. Ottenuto: ${combined}`)
}
{
  const split = splitLocalDateTime("invalid-iso-string")
  assert(split.date === "" && split.time === "", `splitLocalDateTime con stringa ISO non valida deve restituire stringhe vuote. Ottenuto: ${JSON.stringify(split)}`)
}
{
  const split = splitLocalDateTime(null)
  assert(split.date === "" && split.time === "", `splitLocalDateTime con null deve restituire stringhe vuote. Ottenuto: ${JSON.stringify(split)}`)
}

console.log(`\nEsito dei test: ${failures === 0 ? 'Tutti superati!' : `${failures} fallimenti.`}`)

if (failures > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
