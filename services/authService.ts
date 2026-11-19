import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

/**
 * Format de retour uniforme pour les opérations d'authentification.
 */
export interface AuthResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Connecte un utilisateur via son email et son mot de passe.
 *
 * @param email Adresse courriel de l'utilisateur
 * @param password Mot de passe associé
 * @returns L'utilisateur authentifié ou un message d'erreur en français
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse<{ user: User }>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      // Traduction conviviale des erreurs d'authentification Supabase
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid_credentials")
      ) {
        return {
          data: null,
          error: "Identifiants invalides (adresse courriel ou mot de passe incorrect).",
        };
      }

      if (error.message.includes("Email not confirmed")) {
        return {
          data: null,
          error: "Veuillez confirmer votre adresse courriel avant de vous connecter.",
        };
      }

      return {
        data: null,
        error: "Impossible de vous connecter. Veuillez réessayer.",
      };
    }

    if (!data.user) {
      return {
        data: null,
        error: "Utilisateur introuvable suite à l'authentification.",
      };
    }

    return {
      data: { user: data.user },
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Une erreur inattendue est survenue lors de la tentative de connexion.",
    };
  }
}

/**
 * Déconnecte la session active de l'utilisateur.
 *
 * @returns Null si déconnexion réussie ou message d'erreur en français
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        error: "Impossible de fermer la session. Veuillez réessayer.",
      };
    }

    return { error: null };
  } catch {
    return {
      error: "Une erreur inattendue est survenue lors de la déconnexion.",
    };
  }
}

/**
 * Récupère le profil complet de l'utilisateur actuellement connecté, incluant son rôle système.
 * Si l'utilisateur n'est pas connecté, retourne `{ data: null, error: null }`.
 *
 * @returns Le profil utilisateur ou un message d'erreur en français
 */
export async function getCurrentProfile(): Promise<AuthResponse<Profile>> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        data: null,
        error: null,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, role, created_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return {
        data: null,
        error: "Impossible de récupérer le profil utilisateur.",
      };
    }

    return {
      data: profile as Profile,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Une erreur inattendue est survenue lors de la lecture du profil.",
    };
  }
}
