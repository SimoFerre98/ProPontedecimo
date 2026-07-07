// Esegue TUTTE le suite di integrazione in scripts/test-*.mjs contro Supabase locale,
// una dopo l'altra, e riporta un esito aggregato.
//
// Prerequisito: Supabase locale attivo e con le migrazioni applicate
//   npx supabase db reset
//
// Esecuzione:  npm run test:integration
//
// Perché esiste: ogni story che tocca il database (trigger, RPC, RLS) deve essere
// verificata anche contro le suite delle story precedenti che condividono le stesse
// tabelle — vedi CLAUDE.md, sezione "Prima di segnare una story come DONE/REVIEW".
// Aggiungere qui ogni nuovo scripts/test-*.mjs quando viene creato.

import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const self = 'test-all.mjs'

const testScripts = readdirSync(scriptsDir)
  .filter(f => f.startsWith('test-') && f.endsWith('.mjs') && f !== self)
  .sort()

if (testScripts.length === 0) {
  console.error('Nessuno script scripts/test-*.mjs trovato.')
  process.exit(1)
}

console.log(`Esecuzione di ${testScripts.length} suite di integrazione contro Supabase locale...`)
console.log(testScripts.map(s => `  - ${s}`).join('\n') + '\n')

let failures = 0
for (const script of testScripts) {
  console.log(`\n${'='.repeat(60)}\n${script}\n${'='.repeat(60)}`)
  const result = spawnSync('node', [join(scriptsDir, script)], { stdio: 'inherit' })
  if (result.status !== 0) {
    failures++
    console.error(`\n❌ ${script} FALLITO (exit code ${result.status})`)
  }
}

console.log(`\n${'='.repeat(60)}\nRIEPILOGO\n${'='.repeat(60)}`)
if (failures === 0) {
  console.log(`✅ Tutte le ${testScripts.length} suite sono passate.`)
  process.exit(0)
} else {
  console.error(`❌ ${failures}/${testScripts.length} suite fallite.`)
  process.exit(1)
}
