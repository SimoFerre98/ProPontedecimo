import { supabase } from '@/lib/supabase'

// ── Tipi ──────────────────────────────────────────────────────────────────────

export type ParentLinkStatus = 'pending' | 'confirmed'

/** Risultato minimo di search_players_for_parent_request */
export interface PlayerSearchResult {
  id: string
  first_name: string
  last_name: string
  team_sector: string | null
}

/** Riga di get_my_parent_players: dati dell'associazione + dati minimi del figlio */
export interface MyParentPlayer {
  parent_profile_id: string
  player_id: string
  status: ParentLinkStatus
  created_at: string
  first_name: string
  last_name: string
  team_sector: string | null
}

/** Riga di parent_players per la vista admin */
export interface ParentPlayerLink {
  parent_profile_id: string
  player_id: string
  status: ParentLinkStatus
  created_at: string
}

/** Riga arricchita per la vista admin: dati genitore + dati figlio */
export interface ParentPlayerLinkFull extends ParentPlayerLink {
  parent_full_name: string | null
  parent_email: string
  player_first_name: string
  player_last_name: string
  player_team_sector: string | null
}

// ── API Genitore ───────────────────────────────────────────────────────────────

/**
 * Ricerca atleti per nome/cognome tramite RPC search_players_for_parent_request.
 * Solo ruolo 'parent'. Query minima 2 caratteri.
 */
export async function searchPlayersForRequest(query: string): Promise<PlayerSearchResult[]> {
  const { data, error } = await supabase.rpc('search_players_for_parent_request', {
    p_query: query,
  })
  if (error) throw error
  return (data ?? []) as PlayerSearchResult[]
}

/**
 * Inserisce una richiesta di associazione genitore-figlio in stato 'pending'.
 * La RLS garantisce che il genitore possa inserire solo righe proprie con status='pending'.
 */
export async function requestChildLink(playerId: string, parentProfileId: string): Promise<void> {
  const { error } = await supabase.from('parent_players').insert({
    parent_profile_id: parentProfileId,
    player_id: playerId,
    status: 'pending' as ParentLinkStatus,
  })
  if (error) throw error
}

/**
 * Restituisce le associazioni del genitore corrente (pending + confirmed)
 * tramite RPC get_my_parent_players (bypassa RLS restrittiva per il solo proprietario).
 */
export async function getMyChildren(): Promise<MyParentPlayer[]> {
  const { data, error } = await supabase.rpc('get_my_parent_players')
  if (error) throw error
  return (data ?? []) as MyParentPlayer[]
}

// ── API Admin ──────────────────────────────────────────────────────────────────

/**
 * Elenca tutte le associazioni genitore-figlio (pending + confirmed) con dati arricchiti.
 * Solo admin (president/director): la policy parent_players_all_admin controlla l'accesso.
 */
export async function listParentLinkRequests(): Promise<ParentPlayerLinkFull[]> {
  const { data, error } = await supabase
    .from('parent_players')
    .select(
      `
      parent_profile_id,
      player_id,
      status,
      created_at,
      profiles!parent_players_parent_profile_id_fkey(full_name, email),
      players!parent_players_player_id_fkey(first_name, last_name, team_sector)
      `
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as Array<{
    parent_profile_id: string
    player_id: string
    status: ParentLinkStatus
    created_at: string
    profiles: { full_name: string | null; email: string } | null
    players: { first_name: string; last_name: string; team_sector: string | null } | null
  }>).map(row => ({
    parent_profile_id: row.parent_profile_id,
    player_id: row.player_id,
    status: row.status,
    created_at: row.created_at,
    parent_full_name: row.profiles?.full_name ?? null,
    parent_email: row.profiles?.email ?? '',
    player_first_name: row.players?.first_name ?? '',
    player_last_name: row.players?.last_name ?? '',
    player_team_sector: row.players?.team_sector ?? null,
  }))
}

/**
 * Crea direttamente un'associazione confermata (creazione diretta da admin).
 * L'admin usa questo per bypassare il flusso di richiesta pending.
 */
export async function createParentLink(parentProfileId: string, playerId: string): Promise<void> {
  const { error } = await supabase.from('parent_players').insert({
    parent_profile_id: parentProfileId,
    player_id: playerId,
    status: 'confirmed' as ParentLinkStatus,
  })
  if (error) throw error
}

/**
 * Porta una riga da 'pending' a 'confirmed' (conferma richiesta genitore).
 */
export async function confirmParentLink(parentProfileId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('parent_players')
    .update({ status: 'confirmed' as ParentLinkStatus })
    .eq('parent_profile_id', parentProfileId)
    .eq('player_id', playerId)
  if (error) throw error
}

/**
 * Rimuove un'associazione (qualunque stato) — admin only.
 */
export async function removeParentLink(parentProfileId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('parent_players')
    .delete()
    .eq('parent_profile_id', parentProfileId)
    .eq('player_id', playerId)
  if (error) throw error
}
