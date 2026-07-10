-- Migration: add previous_player_id column to players and allow 'carried_over' in payments plan check constraint

-- 1. Add previous_player_id column to players table
ALTER TABLE "public"."players" ADD COLUMN IF NOT EXISTS "previous_player_id" uuid REFERENCES "public"."players"("id") ON DELETE SET NULL;

-- 2. Drop existing check constraint on payments table plan column if it exists
ALTER TABLE "public"."payments" DROP CONSTRAINT IF EXISTS "payments_plan_check";

-- 3. Add updated check constraint to allow 'carried_over' in payments plan column
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_plan_check" CHECK (("plan" = ANY (ARRAY['annual'::text, 'installments'::text, 'carried_over'::text])));


-- 4. Redefine create_season_from_wizard to support previous_player_id and carry over pending debts
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
      is_registered,
      previous_player_id
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
      false, -- is_registered (starts as false)
      up.player_id
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

  -- 4. Calculate and carry over pending debts from the previous season
  INSERT INTO public.payments (
    player_id,
    season_id,
    installment_no,
    plan,
    status,
    amount_eur,
    due_date
  )
  SELECT 
    np.id AS player_id,
    v_new_season_id AS season_id,
    1 AS installment_no,
    'carried_over' AS plan,
    'pending'::public.payment_status AS status,
    sum(op.amount_eur) AS amount_eur,
    p_start_date AS due_date
  FROM public.players np
  JOIN public.payments op ON op.player_id = np.previous_player_id
  WHERE np.season_id = v_new_season_id
    AND np.previous_player_id IS NOT NULL
    AND op.status = 'pending'::public.payment_status
  GROUP BY np.id
  HAVING sum(op.amount_eur) > 0.01;

  RETURN jsonb_build_object(
    'season_id', v_new_season_id,
    'imported_count', v_imported_count
  );
END;
$$;

-- Grant EXECUTE to authenticated role (idempotente, invariato rispetto alla migrazione originale)
REVOKE EXECUTE ON FUNCTION public.create_season_from_wizard(text, date, date, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_season_from_wizard(text, date, date, jsonb) TO authenticated;


-- 5. Redefine create_payment_plan to support co-existence with plan='carried_over'
CREATE OR REPLACE FUNCTION public.create_payment_plan(
  p_player_id uuid,
  p_season_id uuid,
  p_total_amount numeric,
  p_installments jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_user_role public.user_role;
  v_has_paid boolean;
  v_sum_amount numeric := 0;
  v_inst jsonb;
  v_inst_count integer;
  v_installment_no integer := 1;
  v_max_carried_over_no integer := 0;
  v_due_date date;
  v_amount numeric;
BEGIN
  -- Get and check user role
  v_user_role := public.get_user_role();
  IF v_user_role IS DISTINCT FROM 'president'::public.user_role AND v_user_role IS DISTINCT FROM 'director'::public.user_role THEN
    RAISE EXCEPTION 'Not authorized. Only presidents and directors can manage payment plans.' USING ERRCODE = '42501';
  END IF;

  -- 1. Verifica se esistono rate già pagate per questo atleta + stagione (escludendo il debito pregresso)
  SELECT EXISTS (
    SELECT 1 
    FROM public.payments 
    WHERE player_id = p_player_id 
      AND season_id = p_season_id 
      AND status = 'paid'
      AND plan IS DISTINCT FROM 'carried_over'
  ) INTO v_has_paid;

  IF v_has_paid THEN
    RAISE EXCEPTION 'Impossibile modificare il piano: esistono rate già pagate' USING ERRCODE = '22000';
  END IF;

  -- 2. Valida che l'elenco rate non sia vuoto
  v_inst_count := jsonb_array_length(p_installments);
  IF v_inst_count IS NULL OR v_inst_count = 0 THEN
    RAISE EXCEPTION 'Il piano deve contenere almeno una rata' USING ERRCODE = '22023';
  END IF;

  -- 3. Calcola la somma degli importi e valida ogni rata
  FOR v_inst IN SELECT * FROM jsonb_array_elements(p_installments) LOOP
    v_amount := (v_inst->>'amount_eur')::numeric;
    v_due_date := (v_inst->>'due_date')::date;

    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Ogni rata deve avere un importo maggiore di zero' USING ERRCODE = '22023';
    END IF;

    IF v_due_date IS NULL THEN
      RAISE EXCEPTION 'Ogni rata deve avere una data di scadenza valida' USING ERRCODE = '22023';
    END IF;

    v_sum_amount := v_sum_amount + v_amount;
  END LOOP;

  -- 4. Valida che la somma coincida con il totale (tolleranza 0.01)
  IF abs(v_sum_amount - p_total_amount) > 0.01 THEN
    RAISE EXCEPTION 'La somma delle rate (%) non coincide con la quota totale (%)', v_sum_amount, p_total_amount USING ERRCODE = '22023';
  END IF;

  -- 5. Elimina le rate esistenti per atleta+stagione (escludendo il debito pregresso)
  DELETE FROM public.payments 
  WHERE player_id = p_player_id 
    AND season_id = p_season_id
    AND plan IS DISTINCT FROM 'carried_over';

  -- 6. Calcola il massimo installment_no per il debito pregresso esistente
  SELECT coalesce(max(installment_no), 0)
  INTO v_max_carried_over_no
  FROM public.payments
  WHERE player_id = p_player_id
    AND season_id = p_season_id
    AND plan = 'carried_over';

  v_installment_no := v_max_carried_over_no + 1;

  -- 7. Inserisci le nuove rate
  FOR v_inst IN SELECT * FROM jsonb_array_elements(p_installments) LOOP
    v_amount := (v_inst->>'amount_eur')::numeric;
    v_due_date := (v_inst->>'due_date')::date;

    INSERT INTO public.payments (
      player_id,
      season_id,
      installment_no,
      amount_eur,
      due_date,
      status,
      plan
    ) VALUES (
      p_player_id,
      p_season_id,
      v_installment_no,
      v_amount,
      v_due_date,
      'pending'::public.payment_status,
      CASE WHEN v_inst_count = 1 THEN 'annual' ELSE 'installments' END
    );

    v_installment_no := v_installment_no + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_payment_plan(uuid, uuid, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_plan(uuid, uuid, numeric, jsonb) TO service_role;
