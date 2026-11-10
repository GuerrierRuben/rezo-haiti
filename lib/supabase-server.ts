import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variables d'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY obligatoires."
    );
  }

  return { url, anonKey };
}

/**
 * Extrait le token Bearer pur depuis l'en-tête Authorization d'une requête HTTP.
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
    return parts[1];
  }

  return authHeader;
}

/**
 * Crée un client Supabase pour le contexte serveur d'une route API.
 * 
 * IMPORTANT : Ce client utilise uniquement la clé publique (ANON_KEY) et
 * transmet l'en-tête Authorization de la requête HTTP entrante.
 * Ainsi, Supabase et PostgreSQL appliquent nativement les règles RLS (Row Level Security)
 * associées à l'utilisateur connecté (ou rôle 'anon' si non connecté).
 * Aucune clé service_role n'est utilisée.
 */
export function createServerSupabaseClient(req?: Request): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  const token = req ? extractBearerToken(req) : null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}
