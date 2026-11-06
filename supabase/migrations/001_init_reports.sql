-- ==============================================================================
-- Migration : 001_init_reports.sql
-- Projet    : Rezo Ayiti
-- Objectif  : Initialisation de l'extension PostGIS et de la table reports
-- ==============================================================================

-- 1. Activation de l'extension spatiale PostGIS (pour les sprints 2/3)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Création de la table des signalements (reports)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'en_attente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Contraintes de validation
    CONSTRAINT chk_reports_category CHECK (
        category IN ('eau', 'electricite', 'route', 'sante')
    ),
    CONSTRAINT chk_reports_status CHECK (
        status IN ('en_attente', 'valide', 'resolu')
    ),
    CONSTRAINT chk_reports_latitude CHECK (
        latitude >= -90.0 AND latitude <= 90.0
    ),
    CONSTRAINT chk_reports_longitude CHECK (
        longitude >= -180.0 AND longitude <= 180.0
    )
);

-- 3. Index pour optimiser les filtres fréquents
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports (category);

-- Commentaires descriptifs
COMMENT ON TABLE public.reports IS 'Table des signalements citoyens sur les infrastructures publiques en Haïti';
COMMENT ON COLUMN public.reports.category IS 'Catégorie du signalement : eau, electricite, route, sante';
COMMENT ON COLUMN public.reports.status IS 'État d avancement du signalement : en_attente, valide, resolu';
