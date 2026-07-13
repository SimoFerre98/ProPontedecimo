-- Migration: get_financial_trend RPC
-- Created At: 2026-07-12

CREATE OR REPLACE FUNCTION public.get_financial_trend(
  p_season_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_user_role public.user_role;
  v_months jsonb;
  v_totals jsonb;
BEGIN
  -- Get and check user role
  v_user_role := public.get_user_role();
  IF v_user_role IS DISTINCT FROM 'president'::public.user_role AND v_user_role IS DISTINCT FROM 'director'::public.user_role THEN
    RAISE EXCEPTION 'Not authorized. Only presidents and directors can view financial trends.' USING ERRCODE = '42501';
  END IF;

  -- Aggregazione mensile
  SELECT coalesce(jsonb_agg(m), '[]'::jsonb)
  INTO v_months
  FROM (
    SELECT 
      to_char(due_date, 'YYYY-MM') AS month,
      coalesce(sum(amount_eur), 0) AS previsto_eur,
      coalesce(sum(CASE WHEN status = 'paid' AND plan IS DISTINCT FROM 'carried_over' THEN paid_amount_eur ELSE 0 END), 0) AS incassato_quota_eur,
      coalesce(sum(CASE WHEN status = 'paid' AND plan = 'carried_over' THEN paid_amount_eur ELSE 0 END), 0) AS incassato_insoluti_eur
    FROM public.payments
    WHERE season_id = p_season_id
      AND due_date IS NOT NULL
    GROUP BY to_char(due_date, 'YYYY-MM')
    ORDER BY month ASC
  ) m;

  -- Totale generale
  SELECT jsonb_build_object(
    'previsto_totale', coalesce(sum(amount_eur), 0),
    'incassato_totale', coalesce(sum(CASE WHEN status = 'paid' THEN paid_amount_eur ELSE 0 END), 0),
    'insoluti_recuperati', coalesce(sum(CASE WHEN status = 'paid' AND plan = 'carried_over' THEN paid_amount_eur ELSE 0 END), 0),
    'rate_future_residue', coalesce(sum(CASE WHEN status <> 'paid' AND due_date >= CURRENT_DATE THEN amount_eur - coalesce(paid_amount_eur, 0) ELSE 0 END), 0)
  )
  INTO v_totals
  FROM public.payments
  WHERE season_id = p_season_id;

  RETURN jsonb_build_object(
    'months', v_months,
    'totals', v_totals
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_trend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_trend(uuid) TO service_role;
