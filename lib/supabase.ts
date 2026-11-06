import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Variable d'environnement manquante : NEXT_PUBLIC_SUPABASE_URL. Veuillez la définir dans votre fichier .env.local."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Variable d'environnement manquante : NEXT_PUBLIC_SUPABASE_ANON_KEY. Veuillez la définir dans votre fichier .env.local."
  );
}

/**
 * Client Supabase initialisé pour les opérations frontend et API côté client.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
