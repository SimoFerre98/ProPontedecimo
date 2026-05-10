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
CREATE POLICY IF NOT EXISTS "Staff can manage payments"
  ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('president', 'director', 'coach')
    )
  );
