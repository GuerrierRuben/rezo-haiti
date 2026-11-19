-- ==============================================================================
-- Migration : 003_submission_guard.sql
-- Projet    : Rezo Ayiti
-- Objectif  : Journalisation anti-spam, limitation de fréquence et verrouillage
--             de l'insertion directe depuis les clients publics (anon / authenticated).
-- ==============================================================================

-- 1. Table de journalisation des soumissions pour limitation de débit (Rate Limiting)
-- Stocke uniquement le hash cryptographique SHA-256 de l'adresse IP cliente (avec sel secret).
-- Aucune adresse IP en clair n'est enregistrée.
CREATE TABLE IF NOT EXISTS public.submission_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.submission_log IS 'Journal des soumissions anonymisées pour le contrôle du taux de requêtes (anti-spam)';
COMMENT ON COLUMN public.submission_log.ip_hash IS 'Empreinte SHA-256 de l''IP cliente salée côté serveur';
COMMENT ON COLUMN public.submission_log.created_at IS 'Date et heure de la tentative de soumission';

-- 2. Index pour accélérer les requêtes de comptage temporel par adresse IP
CREATE INDEX IF NOT EXISTS idx_submission_log_ip_created 
ON public.submission_log (ip_hash, created_at DESC);

-- 3. Activation de la sécurité niveau ligne (RLS) sans aucune policy client
-- La table submission_log n'a aucune politique RLS pour 'anon' ni 'authenticated'.
-- Seul le rôle d'administration système (service_role) exécuté côté serveur API
-- peut y insérer, lire ou purger les enregistrements.
ALTER TABLE public.submission_log ENABLE ROW LEVEL SECURITY;

-- 4. Verrouillage de l'insertion directe sur la table reports
-- Les soumissions de signalements doivent obligatoirement passer par la route API serveur
-- (/api/reports) afin de subir les contrôles anti-spam (Honeypot, limitation de fréquence, Zod).
-- L'accès direct via les clés publiques anon ou authenticated en INSERT est donc révoqué.
REVOKE INSERT ON public.reports FROM anon, authenticated;

-- NOTE DE SÉCURITÉ :
-- Les droits de lecture (SELECT) et de modération (UPDATE, DELETE) restent pleinement
-- octroyés aux rôles 'anon' et 'authenticated', encadrés par les politiques RLS existantes :
-- - reports_select_policy (lecture publique des signalements 'valide')
-- - reports_update_moderator (mise à jour réservée aux modérateurs via is_moderator())
-- - reports_delete_moderator (suppression réservée aux modérateurs via is_moderator())
-- Le workflow de modération n'est donc absolument pas impacté.
