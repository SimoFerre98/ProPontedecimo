-- ============================================================
-- US-030: Visualizzazione convocazioni — TASK-01
-- RPC per ottenere la prossima convocazione del giocatore loggato
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."get_my_next_call_up"()
RETURNS TABLE (
    "opponent" text,
    "event_type" public.event_type,
    "start_date" timestamp with time zone,
    "meetup_time" timestamp with time zone,
    "is_called_up" boolean,
    "is_published" boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_season_id uuid;
  v_player_id uuid;
  v_team_sector text;
BEGIN
  -- 1. Trova la stagione attiva
  SELECT id INTO v_season_id FROM public.seasons WHERE is_active = true LIMIT 1;
  IF v_season_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Trova l'atleta attivo collegato all'utente autenticato
  SELECT id, team_sector INTO v_player_id, v_team_sector
  FROM public.players
  WHERE profile_id = auth.uid() AND season_id = v_season_id AND is_active = true
  LIMIT 1;

  -- 3. Se non c'è un atleta attivo per il profilo dell'utente loggato, non ritorna alcuna riga
  IF v_player_id IS NULL THEN
    RETURN;
  END IF;

  -- 4. Cerca la prossima partita della leva (start_date >= now())
  SELECT e.opponent, e.event_type, e.start_date, e.meetup_time,
         (e.call_up_published_at IS NOT NULL AND EXISTS (
             SELECT 1 FROM public.call_ups cu
             WHERE cu.event_id = e.id AND cu.player_id = v_player_id
         )),
         (e.call_up_published_at IS NOT NULL)
  INTO opponent, event_type, start_date, meetup_time, is_called_up, is_published
  FROM public.events e
  WHERE e.team_sector = v_team_sector
    AND e.event_type IN ('home_match'::public.event_type, 'away_match'::public.event_type)
    AND e.start_date >= now()
  ORDER BY e.start_date ASC
  LIMIT 1;

  -- 5. Se è stata trovata una partita per la leva, ritorna la riga
  IF FOUND THEN
    RETURN NEXT;
  ELSE
    -- Se non c'è alcuna partita in programma, ritorna una riga con campi a NULL e is_called_up/is_published a false
    opponent := NULL;
    event_type := NULL;
    start_date := NULL;
    meetup_time := NULL;
    is_called_up := false;
    is_published := false;
    RETURN NEXT;
  END IF;
END;
$$;

-- Rimuove permessi pubblici/anonimi e assegna permessi ad authenticated e service_role
REVOKE EXECUTE ON FUNCTION public.get_my_next_call_up() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_next_call_up() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_next_call_up() TO service_role;
