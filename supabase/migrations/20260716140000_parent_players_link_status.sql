-- ============================================================
-- US-027: Associazione figli a carico — TASK-01
-- Introduce lo stato pending/confirmed su parent_players:
--   - Enum parent_link_status
--   - Colonna status (DEFAULT 'confirmed' → comportamento admin invariato)
--   - Fix get_parent_player_ids() → filtra solo 'confirmed' (fix AC3)
--   - Nuova policy parent_players_insert_self_request (solo parent, solo pending, solo sé stesso)
-- ============================================================

-- 1. Enum
CREATE TYPE "public"."parent_link_status" AS ENUM ('pending', 'confirmed');

-- 2. Colonna status su parent_players
--    DEFAULT 'confirmed': le inserzioni admin restano immediatamente attive
ALTER TABLE "public"."parent_players"
  ADD COLUMN "status" "public"."parent_link_status" NOT NULL DEFAULT 'confirmed';

-- 3. Fix get_parent_player_ids() — ora filtra solo righe confirmed.
--    Propaga automaticamente la regola alle quattro policy RLS dipendenti
--    (players_select_parent, medical_select_parent, payments_select_parent,
--    attendance_select_parent) senza toccarle singolarmente.
CREATE OR REPLACE FUNCTION "public"."get_parent_player_ids"() RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(array_agg(player_id), '{}')
  FROM public.parent_players
  WHERE parent_profile_id = auth.uid()
    AND status = 'confirmed';
$$;

-- 4. Policy INSERT self-request per il genitore:
--    - Solo righe proprie (parent_profile_id = auth.uid())
--    - Solo status 'pending' (mai 'confirmed', mai per altri utenti)
--    - Solo ruolo 'parent'
CREATE POLICY "parent_players_insert_self_request" ON "public"."parent_players"
    FOR INSERT
    WITH CHECK (
        "public"."get_user_role"() = 'parent'::"public"."user_role"
        AND "parent_profile_id" = "auth"."uid"()
        AND "status" = 'pending'::"public"."parent_link_status"
    );
