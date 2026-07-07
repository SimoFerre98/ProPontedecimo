-- Migration: fa sì che create_season_from_wizard (US-008) bypassi il trigger
-- di validazione campi obbligatori introdotto da US-009 (validate_player_fields)
-- quando copia atleti storici in una nuova stagione. I dati storici sono spesso
-- incompleti rispetto ai nuovi requisiti e non devono bloccare il rollover di
-- stagione, che è l'esatto caso d'uso per cui il wizard esiste.

CREATE OR REPLACE FUNCTION public.create_season_from_wizard(
  p_name text,
  p_start_date date,
  p_end_date date,
  p_players jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_user_role public.user_role;
  v_new_season_id uuid;
  v_imported_count integer;
  v_expected_count integer;
BEGIN
  -- Get and check user role
  v_user_role := public.get_user_role();
  IF v_user_role IS DISTINCT FROM 'president'::public.user_role AND v_user_role IS DISTINCT FROM 'director'::public.user_role THEN
    RAISE EXCEPTION 'Not authorized. Only presidents and directors can create seasons.' USING ERRCODE = '42501'; -- insufficient privilege
  END IF;

  -- Basic input validation
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Season name cannot be empty.' USING ERRCODE = '22023';
  END IF;
  IF p_start_date >= p_end_date THEN
    RAISE EXCEPTION 'Start date must be before end date.' USING ERRCODE = '22023';
  END IF;

  -- 1. Deactivate current active seasons
  UPDATE public.seasons
  SET is_active = false
  WHERE is_active = true;

  -- 2. Insert new season (marked as active)
  INSERT INTO public.seasons (name, start_date, end_date, is_active)
  VALUES (p_name, p_start_date, p_end_date, true)
  RETURNING id INTO v_new_season_id;

  -- Bypassa trg_validate_player_fields (US-009) solo per la durata di questa
  -- transazione: gli atleti copiati provengono da una stagione precedente già
  -- persistita, non da un nuovo inserimento che deve rispettare i requisiti odierni.
  PERFORM set_config('app.bypass_player_validation', 'true', true);

  -- 3. Copy players from the JSONB payload (with duplicate elimination)
  -- Payload is array of {player_id, team_sector}
  WITH unique_players AS (
    SELECT DISTINCT ON (player_id) player_id, team_sector
    FROM jsonb_to_recordset(p_players) AS jp(player_id uuid, team_sector text)
    ORDER BY player_id
  ),
  inserted_players AS (
    INSERT INTO public.players (
      season_id,
      first_name,
      last_name,
      team_sector,
      citizenship,
      birth_date,
      birth_place,
      tax_code,
      address_street,
      address_locality,
      address_city,
      address_zip,
      phone_home,
      phone_player,
      parent1_name,
      parent1_phone,
      parent1_tax_code,
      parent2_name,
      parent2_phone,
      parent2_tax_code,
      email,
      figc_registration,
      medical_expiry,
      notes,
      privacy_accepted,
      profile_id,
      is_active,
      is_registered
    )
    SELECT
      v_new_season_id,
      p.first_name,
      p.last_name,
      up.team_sector,
      p.citizenship,
      p.birth_date,
      p.birth_place,
      p.tax_code,
      p.address_street,
      p.address_locality,
      p.address_city,
      p.address_zip,
      p.phone_home,
      p.phone_player,
      p.parent1_name,
      p.parent1_phone,
      p.parent1_tax_code,
      p.parent2_name,
      p.parent2_phone,
      p.parent2_tax_code,
      p.email,
      p.figc_registration,
      p.medical_expiry,
      p.notes,
      p.privacy_accepted,
      p.profile_id,
      true, -- is_active
      false -- is_registered (starts as false)
    FROM unique_players up
    JOIN public.players p ON p.id = up.player_id
    RETURNING id
  )
  SELECT count(*) INTO v_imported_count FROM inserted_players;

  -- Detect players referenced in the payload that no longer exist: the INNER JOIN above
  -- silently drops them, so compare against the distinct id count instead of failing quietly.
  SELECT count(DISTINCT player_id) INTO v_expected_count
  FROM jsonb_to_recordset(p_players) AS jp(player_id uuid, team_sector text);

  IF v_expected_count <> v_imported_count THEN
    RAISE EXCEPTION 'One or more selected players no longer exist. No changes were made.' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'season_id', v_new_season_id,
    'imported_count', v_imported_count
  );
END;
$$;

-- Grant EXECUTE to authenticated role (idempotente, invariato rispetto alla migrazione originale)
REVOKE EXECUTE ON FUNCTION public.create_season_from_wizard(text, date, date, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_season_from_wizard(text, date, date, jsonb) TO authenticated;
