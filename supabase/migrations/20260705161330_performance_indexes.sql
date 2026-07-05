-- US-003: indici per i filtri delle liste atleti e pagamenti.
--
-- Dei tre indici richiesti dalla story, idx_payments_status esiste già dalla
-- migrazione baseline (20260704154518) insieme a idx_payments_player/season e
-- idx_players_season/sector/profile: qui si aggiungono solo i due mancanti.

-- Filtro "attivi/disattivati" di athleteService.getPlayers (.eq('is_active', ...)).
-- Nota: su un boolean il planner usa l'indice essenzialmente per il valore raro
-- (is_active = false, l'archivio dei disattivati); per la maggioranza attiva il
-- seq scan resta la scelta corretta.
CREATE INDEX IF NOT EXISTS "idx_players_is_active"
    ON "public"."players" USING "btree" ("is_active");

-- Filtri scadenze mediche (.lt/.gte('medical_expiry', oggi)) usati da liste e alert.
CREATE INDEX IF NOT EXISTS "idx_players_medical_expiry"
    ON "public"."players" USING "btree" ("medical_expiry");
