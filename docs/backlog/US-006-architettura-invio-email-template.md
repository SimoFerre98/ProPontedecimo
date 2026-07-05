# US-006: Architettura invio email e template promemoria visite mediche

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** MVP

**Story**
Come Dirigente,
voglio che il sistema possa inviare email automatiche tramite Resend e Supabase Edge Functions, a partire dai promemoria per le visite mediche in scadenza,
così che le famiglie siano avvisate in tempo senza solleciti manuali.

**Demonstrates**
After implementing this story, the user can: innescare l'invio di un'email di promemoria visita medica con template grafico brandizzato e riceverla nella casella di destinazione.

**Acceptance Criteria**
- [ ] Una Edge Function invoca Resend e invia correttamente un'email di test
- [ ] Il template grafico del promemoria visite mediche è definito e coerente con l'identità visiva della società
- [ ] L'architettura (trigger, scheduling, gestione errori di invio) è documentata per i futuri casi d'uso email
- [ ] Un invio fallito viene registrato e non blocca l'applicazione

**Status:** TODO
**Plan:** —

