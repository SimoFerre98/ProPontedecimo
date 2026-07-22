export type AthletesFilters = {
  isActive?: 'all' | 'active' | 'inactive'
  isRegistered?: 'all' | 'yes' | 'no'
  medicalStatus?: 'all' | 'expired' | 'valid' | 'missing'
  privacyStatus?: 'all' | 'accepted' | 'missing'
  registrationStatus?: 'all' | 'missing'
  sortBy?: 'last_name' | 'created_at' | 'medical_expiry' | 'team_sector' | 'is_active' | 'is_registered'
  sortDir?: 'asc' | 'desc'
}

export type PaymentsFilters = {
  status?: 'pending' | 'paid' | 'overdue' | 'all'
  sortBy?: 'due_date' | 'player_name' | 'amount'
  sortDir?: 'asc' | 'desc'
}
