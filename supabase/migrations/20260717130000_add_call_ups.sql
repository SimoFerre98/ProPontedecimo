-- ============================================================
-- US-032: Gestione convocazioni — TASK-01
-- Estende events con i dati di una partita (avversario, leva,
-- stato di pubblicazione della convocazione) e introduce la
-- tabella call_ups (presenza riga = atleta convocato).
--
-- Queste colonne su events sono pensate per essere riusate senza
-- una seconda migrazione da US-030 (visualizzazione convocazioni)
-- e US-031 (calendario/classifica leva) — vedi CLAUDE.md,
-- "Superfici condivise".
-- ============================================================

-- 1. Colonne aggiuntive su events (tutte nullable: obbligatorie solo
--    nel flusso applicativo "crea partita per la convocazione", non
--    a livello DB, per non introdurre un vincolo globale su una
--    tabella scritta anche da US-012/US-013).
ALTER TABLE "public"."events"
  ADD COLUMN IF NOT EXISTS "opponent" "text",
  ADD COLUMN IF NOT EXISTS "team_sector" "text",
  ADD COLUMN IF NOT EXISTS "call_up_published_at" timestamp with time zone;

-- 2. Tabella call_ups: nessuna colonna di stato, la presenza della
--    riga è lo stato "convocato" (come le presenze "da segnare" in
--    attendance). "Non convocato" è l'assenza della riga.
CREATE TABLE IF NOT EXISTS "public"."call_ups" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "player_id" uuid NOT NULL,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT "call_ups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "call_ups_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE,
    CONSTRAINT "call_ups_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE,
    CONSTRAINT "call_ups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    CONSTRAINT "call_ups_event_id_player_id_key" UNIQUE ("event_id", "player_id")
);

CREATE INDEX IF NOT EXISTS "idx_call_ups_event" ON "public"."call_ups" USING "btree" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_call_ups_player" ON "public"."call_ups" USING "btree" ("player_id");

ALTER TABLE "public"."call_ups" ENABLE ROW LEVEL SECURITY;

-- 3. RLS a policy separate per comando: il vincolo temporale
--    (meetup_time > now()) si applica solo a scrittura/cancellazione,
--    mai a lettura — altrimenti l'allenatore perderebbe la visibilità
--    sulle convocazioni delle partite già giocate.

-- Lettura: l'allenatore vede sempre le convocazioni dei propri atleti
DROP POLICY IF EXISTS "call_ups_select_coach" ON "public"."call_ups";
CREATE POLICY "call_ups_select_coach" ON "public"."call_ups"
    FOR SELECT USING (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND "public"."is_coach_of_player"("player_id")
    );

-- Scrittura: solo atleti della propria leva (AC4) e solo fino al
-- ritrovo dell'evento (AC3), realizzato a livello database.
DROP POLICY IF EXISTS "call_ups_insert_coach" ON "public"."call_ups";
CREATE POLICY "call_ups_insert_coach" ON "public"."call_ups"
    FOR INSERT WITH CHECK (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND "public"."is_coach_of_player"("player_id")
        AND EXISTS (
            SELECT 1 FROM "public"."events" e
            WHERE e.id = "call_ups"."event_id"
              AND e.meetup_time > now()
        )
    );

DROP POLICY IF EXISTS "call_ups_delete_coach" ON "public"."call_ups";
CREATE POLICY "call_ups_delete_coach" ON "public"."call_ups"
    FOR DELETE USING (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND "public"."is_coach_of_player"("player_id")
        AND EXISTS (
            SELECT 1 FROM "public"."events" e
            WHERE e.id = "call_ups"."event_id"
              AND e.meetup_time > now()
        )
    );

-- Admin: nessuna restrizione di leva o di tempo (stesso pattern di events_all_admin)
DROP POLICY IF EXISTS "call_ups_all_admin" ON "public"."call_ups";
CREATE POLICY "call_ups_all_admin" ON "public"."call_ups"
    USING ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]))
    WITH CHECK ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]));

-- Verifica se la convocazione dell'evento indicato è stata pubblicata.
-- SECURITY DEFINER perché il ruolo player non ha (e non deve avere, per
-- questa story) alcuna policy SELECT su events: senza bypassare la RLS
-- qui, la sottoquery risulterebbe sempre falsa e nessun giocatore
-- vedrebbe mai la propria convocazione, indipendentemente dallo stato
-- di pubblicazione.
CREATE OR REPLACE FUNCTION "public"."is_call_up_published"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id
      AND call_up_published_at IS NOT NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_call_up_published(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_call_up_published(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_call_up_published(uuid) TO service_role;

-- Giocatore: solo le proprie righe, e solo se la convocazione è
-- pubblicata (AC di US-030, che riusa questa stessa tabella/migrazione)
DROP POLICY IF EXISTS "call_ups_select_player" ON "public"."call_ups";
CREATE POLICY "call_ups_select_player" ON "public"."call_ups"
    FOR SELECT USING (
        "public"."get_user_role"() = 'player'::"public"."user_role"
        AND EXISTS (
            SELECT 1 FROM "public"."players" p
            WHERE p.id = "call_ups"."player_id"
              AND p.profile_id = auth.uid()
        )
        AND "public"."is_call_up_published"("call_ups"."event_id")
    );
