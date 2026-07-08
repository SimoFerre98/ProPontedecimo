import { createClient } from '@supabase/supabase-js'

const URL_ = 'http://127.0.0.1:54321'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

async function seed() {
  console.log('Seeding data for UI verification...')

  // 1. Create or retrieve active season
  let seasonId
  const { data: seasons } = await admin.from('seasons').select('id').eq('is_active', true).limit(1)
  if (seasons && seasons.length > 0) {
    seasonId = seasons[0].id
    console.log(`Using existing active season ID: ${seasonId}`)
  } else {
    const { data: newSeason, error: seErr } = await admin.from('seasons')
      .insert({ name: 'Stagione 2026/2027', start_date: '2026-07-01', end_date: '2027-06-30', is_active: true })
      .select('id').single()
    if (seErr) {
      console.error('Error creating season:', seErr.message)
      process.exit(1)
    }
    seasonId = newSeason.id
    console.log(`Created active season ID: ${seasonId}`)
  }

  // 2. Create admin/president user if not exists
  const email = 'admin@propontedecimo.test'
  const password = 'Password123!'
  const { data: usersData } = await admin.auth.admin.listUsers()
  let userId
  const existingUser = usersData?.users?.find(u => u.email === email)
  if (existingUser) {
    userId = existingUser.id
    console.log(`User ${email} already exists with ID: ${userId}`)
  } else {
    const { data: newUser, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (userErr) {
      console.error('Error creating user:', userErr.message)
      process.exit(1)
    }
    userId = newUser.user.id
    console.log(`Created user ${email} with ID: ${userId}`)
  }

  // Upsert profile for this user as president
  const { error: profileErr } = await admin.from('profiles').upsert({
    id: userId,
    email,
    full_name: 'Presidente ASD',
    role: 'president'
  })
  if (profileErr) {
    console.error('Error upserting profile:', profileErr.message)
    process.exit(1)
  }
  console.log('Upserted user profile as president.')

  // 3. Clear existing players to avoid clutter
  await admin.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Cleared existing players.')

  // 4. Insert test players
  const playersToInsert = [
    {
      first_name: 'Mario',
      last_name: 'Rossi',
      birth_date: '1990-01-01',
      birth_place: 'Genova',
      citizenship: 'Italiana',
      team_sector: 'Prima Squadra',
      address_street: 'Via Roma 1',
      address_city: 'Genova',
      address_zip: '16100',
      email: 'mario.rossi@example.com',
      phone_player: '3331122333',
      privacy_accepted: true,
      tax_code: 'RSSMRA90A01D969X',
      figc_registration: '123456',
      season_id: seasonId,
      is_active: true,
      is_registered: true
    },
    {
      first_name: 'Luigi',
      last_name: 'Verdi',
      birth_date: '1995-05-15',
      birth_place: 'Genova',
      citizenship: 'Italiana',
      team_sector: 'Prima Squadra',
      address_street: 'Via Milano 2',
      address_city: 'Genova',
      address_zip: '16100',
      email: 'luigi.verdi@example.com',
      phone_player: '3331122334',
      privacy_accepted: true,
      tax_code: 'VRDLGU95E15D969Z',
      figc_registration: null, // No FIGC registration
      season_id: seasonId,
      is_active: true,
      is_registered: false
    },
    {
      first_name: 'Anna',
      last_name: 'Bianchi',
      birth_date: '1992-08-20',
      birth_place: 'Milano',
      citizenship: 'Italiana',
      team_sector: 'Prima Squadra',
      address_street: 'Via Torino 3',
      address_city: 'Genova',
      address_zip: '16100',
      email: 'anna.bianchi@example.com',
      phone_player: '3331122335',
      privacy_accepted: true,
      tax_code: 'BNCNDA92M60F205W',
      figc_registration: '987654',
      season_id: seasonId,
      is_active: true,
      is_registered: true
    }
  ]

  for (const player of playersToInsert) {
    const { error: plErr } = await admin.from('players').insert(player)
    if (plErr) {
      console.error(`Error inserting player ${player.first_name}:`, plErr.message)
    } else {
      console.log(`Inserted player ${player.first_name} ${player.last_name}`)
    }
  }

  console.log('Seeding completed successfully!')
}

seed()
