-- ==============================================================================
-- Migration : 002_profiles_rls_geo.sql
-- Projet    : Rezo Ayiti
-- Objectif  : Profils utilisateurs, sécurité RLS, géolocalisation PostGIS et RPC
-- ==============================================================================

-- 1. Table des profils utilisateurs (liée à auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'citoyen' CHECK (role IN ('citoyen', 'moderateur', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Profils publics et rôles associés aux comptes auth.users';
COMMENT ON COLUMN public.profiles.role IS 'Rôle système : citoyen, moderateur, admin';

-- 2. Trigger pour créer automatiquement un profil à chaque nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            split_part(NEW.email, '@', 1)
        ),
        'citoyen'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Évolution de la table reports
-- Ajout de la clé étrangère vers profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.reports 
        ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Ajout de updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.reports 
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_updated_at ON public.reports;
CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Ajout de la colonne spatiale calculée location (Point PostGIS en SRID 4326)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'location'
    ) THEN
        ALTER TABLE public.reports 
        ADD COLUMN location GEOGRAPHY(Point, 4326) 
        GENERATED ALWAYS AS (
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        ) STORED;
    END IF;
END $$;

-- Index spatial GIST sur la colonne location
CREATE INDEX IF NOT EXISTS idx_reports_location ON public.reports USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports (user_id);

-- 4. Fonctions de sécurité d'aide (Helper functions pour RLS)
-- Fonction vérifiant si l'utilisateur courant est modérateur ou administrateur
CREATE OR REPLACE FUNCTION public.is_moderator(user_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF user_uid IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_uid
        AND role IN ('moderateur', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fonction vérifiant si l'utilisateur courant est administrateur
CREATE OR REPLACE FUNCTION public.is_admin(user_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF user_uid IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_uid
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Activation et configuration de la sécurité niveau ligne (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- --- POLICIES POUR PROFILES ---
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        -- Empêche l'utilisateur normal de modifier son propre rôle
        AND (
            role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
            OR public.is_admin(auth.uid())
        )
    );

-- --- POLICIES POUR REPORTS ---
-- Lecture : public si 'valide', auteur si propre signalement, modérateurs/admins voient tout
DROP POLICY IF EXISTS "reports_select_policy" ON public.reports;
CREATE POLICY "reports_select_policy" ON public.reports
    FOR SELECT
    USING (
        status = 'valide'
        OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
        OR public.is_moderator(auth.uid())
    );

-- Insertion : tout le monde peut créer, statut obligatoirement 'en_attente'
DROP POLICY IF EXISTS "reports_insert_policy" ON public.reports;
CREATE POLICY "reports_insert_policy" ON public.reports
    FOR INSERT
    WITH CHECK (
        status = 'en_attente'
        AND (user_id IS NULL OR user_id = auth.uid())
    );

-- Mise à jour : réservée aux modérateurs et administrateurs
DROP POLICY IF EXISTS "reports_update_moderator" ON public.reports;
CREATE POLICY "reports_update_moderator" ON public.reports
    FOR UPDATE
    USING (public.is_moderator(auth.uid()))
    WITH CHECK (public.is_moderator(auth.uid()));

-- Suppression : réservée aux modérateurs et administrateurs
DROP POLICY IF EXISTS "reports_delete_moderator" ON public.reports;
CREATE POLICY "reports_delete_moderator" ON public.reports
    FOR DELETE
    USING (public.is_moderator(auth.uid()));

-- 6. Fonction RPC pour la recherche de proximité géographique (ST_DWithin)
CREATE OR REPLACE FUNCTION public.nearby_reports(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION DEFAULT 5000
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    status VARCHAR,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_id UUID,
    distance_meters DOUBLE PRECISION
) AS $$
DECLARE
    v_center GEOGRAPHY;
    v_clamped_radius DOUBLE PRECISION;
BEGIN
    -- Validation du point central
    IF p_lat IS NULL OR p_lng IS NULL THEN
        RAISE EXCEPTION 'Latitude et longitude obligatoires';
    END IF;

    -- Rayon limité à 50 000 mètres (50 km)
    v_clamped_radius := LEAST(GREATEST(COALESCE(p_radius_meters, 5000), 1), 50000);
    v_center := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        r.id,
        r.title,
        r.description,
        r.category,
        r.latitude,
        r.longitude,
        r.status,
        r.created_at,
        r.updated_at,
        r.user_id,
        ROUND(ST_Distance(r.location, v_center)::numeric, 2)::DOUBLE PRECISION AS distance_meters
    FROM public.reports r
    WHERE
        -- Application des règles de visibilité RLS
        (
            r.status = 'valide'
            OR (auth.uid() IS NOT NULL AND r.user_id = auth.uid())
            OR public.is_moderator(auth.uid())
        )
        AND ST_DWithin(r.location, v_center, v_clamped_radius)
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.nearby_reports IS 'Recherche géospatiale des signalements dans un rayon donné (max 50 km)';
