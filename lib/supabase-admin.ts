import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Récupère les variables d'environnement requises pour le client d'administration Supabase.
 * La clé SUPABASE_SERVICE_ROLE_KEY ne possède jamais le préfixe NEXT_PUBLIC_
 * et ne doit sous aucun prétexte être exposée au navigateur.
 */
function getAdminEnv(): { url: string; serviceRoleKey: string } {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    // Si la clé n'est pas encore définie (ex: environnement local avant configuration ou CI),
    // on renvoie une valeur factice en mode test/fallback pour ne pas faire crasher l'analyse de build statique.
    return {
      url: url || "https://dummy-placeholder.supabase.co",
      serviceRoleKey: serviceRoleKey || "dummy-service-role-key-placeholder",
    };
  }

  return { url, serviceRoleKey };
}

let adminClient: SupabaseClient | null = null;

/**
 * Client Supabase administratif doté de la clé service_role.
 * Ce client outrepasse les règles RLS et ne doit être utilisé qu'au sein des routes API serveur
 * pour des opérations contrôlées (vérification du rate-limiting et insertion anti-spam).
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    const { url, serviceRoleKey } = getAdminEnv();
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClient;
}

export const supabaseAdmin = getSupabaseAdminClient();
