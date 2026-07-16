-- ============================================================
-- US-027: Associazione figli a carico — TASK-02
-- RPC SECURITY DEFINER per il genitore:
--   - search_players_for_parent_request: ricerca atleta per nome (solo parent, campi minimi)
--   - get_my_parent_players: righe proprie (pending + confirmed) con dati atleta minimi
-- ============================================================

-- 1. search_players_for_parent_request
--    Restituisce solo i campi strettamente necessari al picker di ricerca.
--    Requisiti di sicurezza:
--      - Solo ruolo 'parent'
--      - Query minima 2 caratteri (anti-dump)
--      - Nessun dato sensibile (no tax_code, address_*, dati medici/finanziari)
CREATE OR REPLACE FUNCTION "public"."search_players_for_parent_request"(
    "p_query" text
) RETURNS TABLE (
    "id"           uuid,
    "first_name"   text,
    "last_name"    text,
    "team_sector"  text
)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Solo ruolo parent
    IF public.get_user_role() <> 'parent' THEN
        RETURN;
    END IF;

    -- Query minima 2 caratteri
    IF length(trim(p_query)) < 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
        SELECT
            pl.id,
            pl.first_name,
            pl.last_name,
            pl.team_sector
        FROM public.players pl
        WHERE
            pl.first_name ILIKE '%' || trim(p_query) || '%'
            OR pl.last_name ILIKE '%' || trim(p_query) || '%'
        ORDER BY pl.last_name, pl.first_name
        LIMIT 20;
END;
$$;

-- 2. get_my_parent_players
--    Restituisce le righe pending + confirmed del genitore chiamante,
--    con i dati minimi dell'atleta. Bypassa intenzionalmente la RLS restrittiva
--    (altrimenti il genitore non vedrebbe nemmeno le proprie richieste pending).
CREATE OR REPLACE FUNCTION "public"."get_my_parent_players"()
RETURNS TABLE (
    "parent_profile_id" uuid,
    "player_id"         uuid,
    "status"            "public"."parent_link_status",
    "created_at"        timestamptz,
    "first_name"        text,
    "last_name"         text,
    "team_sector"       text
)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT
        pp.parent_profile_id,
        pp.player_id,
        pp.status,
        pp.created_at,
        pl.first_name,
        pl.last_name,
        pl.team_sector
    FROM public.parent_players pp
    JOIN public.players pl ON pl.id = pp.player_id
    WHERE pp.parent_profile_id = auth.uid();
$$;
