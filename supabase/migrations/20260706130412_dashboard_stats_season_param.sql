-- Migrazione: Aggiunta del parametro p_season_id alla RPC get_dashboard_stats
-- Riferimento: US-007

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_season_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_season_id uuid;
  v_total_players integer;
  v_total_revenue numeric;
  v_collected_amount numeric;
  v_overdue_amount numeric;
  v_active_tasks integer;
BEGIN
  -- 1. Determina la stagione di riferimento
  -- Se p_season_id è NULL, usiamo la stagione is_active = true
  IF p_season_id IS NOT NULL THEN
    v_target_season_id := p_season_id;
  ELSE
    SELECT id INTO v_target_season_id FROM public.seasons WHERE is_active = true LIMIT 1;
  END IF;

  -- 2. Calcolo totale atleti in rosa per la stagione
  SELECT count(*) INTO v_total_players
  FROM public.players
  WHERE is_active = true
    AND (season_id = v_target_season_id OR v_target_season_id IS NULL);

  -- 3. Calcolo entrate e insoluti (sui pagamenti della stagione)
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0)
  INTO 
    v_total_revenue, 
    v_collected_amount, 
    v_overdue_amount
  FROM public.payments
  WHERE (season_id = v_target_season_id OR v_target_season_id IS NULL);

  -- 4. Task attivi (i task attualmente non sono associati a una stagione specifica, restano globali)
  SELECT count(*) INTO v_active_tasks
  FROM public.tasks
  WHERE status != 'completed';

  -- 5. Ritorno payload JSON
  RETURN json_build_object(
    'total_players', v_total_players,
    'total_revenue', v_total_revenue,
    'collected_amount', v_collected_amount,
    'overdue_amount', v_overdue_amount,
    'active_tasks', v_active_tasks,
    'season_id', v_target_season_id
  );
END;
$$;