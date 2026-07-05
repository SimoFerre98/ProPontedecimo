-- ============================================================
-- Migration: Aggiornamento tabella payments per gestione rate
-- Da eseguire nel Supabase SQL Editor
-- ============================================================

-- 1. Aggiungi le nuove colonne alla tabella payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'installments' CHECK (plan IN ('annual', 'installments')),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS paid_amount_eur NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('satispay', 'contanti', 'pos', 'iban')),
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS receipt_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Aggiorna le scadenze delle rate esistenti (opzionale, se ci sono dati)
-- 1ª rata = 15 settembre dell'anno corrente
UPDATE payments SET due_date = (EXTRACT(YEAR FROM NOW()) || '-09-15')::DATE WHERE installment_no = 1 AND due_date IS NULL;
-- 2ª rata = 15 gennaio dell'anno successivo
UPDATE payments SET due_date = ((EXTRACT(YEAR FROM NOW()) + 1) || '-01-15')::DATE WHERE installment_no = 2 AND due_date IS NULL;

-- 3. Abilita RLS se non già fatto (sicurezza)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: solo staff (president, director) può leggere/scrivere
DROP POLICY IF EXISTS "Staff can manage payments" ON payments;
CREATE POLICY "Staff can manage payments"
  ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('president', 'director', 'coach')
    )
  );

-- 4. Funzione RPC per la Dashboard (Ottimizzazione N+1 queries)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS json AS $$
DECLARE
  total_players INT;
  expiring_medical INT;
  urgent_medical INT;
  pending_payments INT;
  sectors_data JSON;
  today DATE := CURRENT_DATE;
  in_30_days DATE := CURRENT_DATE + INTERVAL '30 days';
  in_7_days DATE := CURRENT_DATE + INTERVAL '7 days';
BEGIN
  -- Totale atleti attivi
  SELECT count(*) INTO total_players FROM players WHERE is_active = true;
  
  -- Scadenze mediche nei prossimi 30 giorni
  SELECT count(*) INTO expiring_medical FROM players 
    WHERE is_active = true 
    AND medical_expiry >= today 
    AND medical_expiry <= in_30_days;

  -- Scadenze mediche entro 7 giorni (urgenti)
  SELECT count(*) INTO urgent_medical FROM players 
    WHERE is_active = true 
    AND medical_expiry >= today 
    AND medical_expiry <= in_7_days;

  -- Pagamenti pending
  SELECT count(*) INTO pending_payments FROM payments WHERE status = 'pending';

  -- Atleti per settore
  SELECT COALESCE(json_agg(json_build_object('sector', COALESCE(team_sector, 'Non assegnato'), 'count', c)), '[]'::json)
  INTO sectors_data
  FROM (
    SELECT team_sector, count(*) as c 
    FROM players 
    WHERE is_active = true 
    GROUP BY team_sector
    ORDER BY c DESC
  ) as s;

  -- Ritorna tutto insieme
  RETURN json_build_object(
    'totalPlayers', total_players,
    'expiringMedical', expiring_medical,
    'urgentMedical', urgent_medical,
    'pendingPayments', pending_payments,
    'sectors', sectors_data
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 5. Forza l'aggiornamento della cache per l'API
NOTIFY pgrst, 'reload schema';
