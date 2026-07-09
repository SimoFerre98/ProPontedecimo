-- Migration: create_payment_plan RPC
-- Created At: 2026-07-09

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
  v_due_date date;
  v_amount numeric;
BEGIN
  -- Get and check user role
  v_user_role := public.get_user_role();
  IF v_user_role IS DISTINCT FROM 'president'::public.user_role AND v_user_role IS DISTINCT FROM 'director'::public.user_role THEN
    RAISE EXCEPTION 'Not authorized. Only presidents and directors can manage payment plans.' USING ERRCODE = '42501';
  END IF;

  -- 1. Verifica se esistono rate già pagate per questo atleta + stagione
  SELECT EXISTS (
    SELECT 1 
    FROM public.payments 
    WHERE player_id = p_player_id 
      AND season_id = p_season_id 
      AND status = 'paid'
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

  -- 5. Elimina le rate esistenti per atleta+stagione
  DELETE FROM public.payments 
  WHERE player_id = p_player_id 
    AND season_id = p_season_id;

  -- 6. Inserisci le nuove rate
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
