-- ============================================================
-- US-048: Fix tabella errata in inventoryService
-- inventoryService.ts, Inventory.tsx e AddInventoryModal.tsx presumono
-- colonne (unit, min_stock, last_update) e una category testo libero
-- che lo schema baseline di inventory_items non ha mai avuto. Questa
-- migrazione allinea lo schema al codice esistente già scritto per
-- il target (decisione presa in sessione di planning, vedi
-- docs/planning/US-048-plan.md — alternativa "adattare la UI allo
-- schema minimale" scartata su indicazione esplicita dell'utente).
-- ============================================================

ALTER TABLE "public"."inventory_items"
    ALTER COLUMN "category" TYPE "text" USING "category"::"text",
    ALTER COLUMN "category" SET DEFAULT 'other';

DROP TYPE IF EXISTS "public"."inventory_category";

ALTER TABLE "public"."inventory_items"
    ADD COLUMN "unit" "text" NOT NULL DEFAULT 'pz',
    ADD COLUMN "min_stock" integer NOT NULL DEFAULT 5 CHECK ("min_stock" >= 0);

ALTER TABLE "public"."inventory_items"
    RENAME COLUMN "updated_at" TO "last_update";
