import { supabase } from "@/lib/supabase";
import type {
  CreateReportInput,
  Report,
  ReportCategory,
  ReportStatus,
} from "@/types";

/**
 * Format de retour unifié pour toutes les méthodes du service.
 * Garantit l'absence d'exceptions non gérées côté UI et masque les détails SQL bruts.
 */
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Options de filtrage et de pagination pour la récupération des signalements.
 */
export interface GetReportsOptions {
  category?: ReportCategory;
  status?: ReportStatus;
  limit?: number;
}

/**
 * Crée un nouveau signalement citoyen en appelant la route API sécurisée (/api/reports).
 * Cette route applique les protections anti-spam (Honeypot, limitation de fréquence et validation).
 *
 * @param input Données nécessaires à la création du signalement (avec champ honeypot optionnel)
 * @returns Le signalement créé ou un message d'erreur en français
 */
export async function createReport(
  input: CreateReportInput & { website?: string }
): Promise<ServiceResponse<Report>> {
  try {
    let authHeader: Record<string, string> = {};
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = { Authorization: `Bearer ${session.access_token}` };
      }
    } catch {
      // Ignorer si la session ne peut être extraite
    }

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(input),
    });

    if (response.status === 429) {
      return {
        data: null,
        error: "Trop de signalements envoyés, réessayez dans quelques minutes.",
      };
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        result?.error?.message ||
        "Impossible d'enregistrer le signalement. Veuillez vérifier votre saisie.";
      return {
        data: null,
        error: message,
      };
    }

    return {
      data: (result?.data as Report) ?? null,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Une erreur inattendue est survenue lors de l'envoi du signalement.",
    };
  }
}

/**
 * Récupère les signalements triés par date de création décroissante (du plus récent au plus ancien).
 * Limite par défaut fixée à 50 signalements.
 *
 * @param options Filtres optionnels (catégorie, statut, limite)
 * @returns Tableau de signalements ou message d'erreur en français
 */
export async function getReports(
  options?: GetReportsOptions
): Promise<ServiceResponse<Report[]>> {
  try {
    const limit = options?.limit ?? 50;

    let query = supabase
      .from("reports")
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options?.category) {
      query = query.eq("category", options.category);
    }

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;

    if (error) {
      return {
        data: null,
        error: "Impossible de récupérer les signalements.",
      };
    }

    return {
      data: (data as Report[]) ?? [],
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Une erreur inattendue est survenue lors du chargement des signalements.",
    };
  }
}

/**
 * Récupère un signalement par son identifiant unique.
 *
 * @param id Identifiant UUID du signalement
 * @returns Le signalement trouvé, null si inexistant/non autorisé, ou message d'erreur en français
 */
export async function getReportById(
  id: string
): Promise<ServiceResponse<Report>> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: "Impossible de récupérer le signalement.",
      };
    }

    return {
      data: (data as Report) ?? null,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Une erreur inattendue est survenue lors de la récupération du signalement.",
    };
  }
}

/**
 * Met à jour le statut d'un signalement dans la table reports (réservé aux modérateurs).
 * Utilise .update({ status }).eq('id', id).select().single() conformément aux règles RLS.
 *
 * @param id Identifiant UUID du signalement
 * @param status Nouveau statut ('en_attente' | 'valide' | 'resolu')
 * @returns Le signalement mis à jour ou un message d'erreur en français
 */
export async function updateReportStatus(
  id: string,
  status: ReportStatus
): Promise<ServiceResponse<Report>> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", id)
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id"
      )
      .single();

    if (error) {
      // Si la RLS refuse (code 42501) ou si aucune ligne n'est retournée (PGRST116)
      if (error.code === "PGRST116" || error.code === "42501") {
        return {
          data: null,
          error: "Action non autorisée ou signalement introuvable.",
        };
      }

      return {
        data: null,
        error: "Impossible de mettre à jour le statut du signalement.",
      };
    }

    if (!data) {
      return {
        data: null,
        error: "Action non autorisée ou signalement introuvable.",
      };
    }

    return {
      data: data as Report,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Une erreur inattendue est survenue lors de la mise à jour du statut.",
    };
  }
}

/**
 * Récupère tous les signalements sans filtre de statut (réservé à l'espace de modération).
 * En vertu des politiques RLS Postgres, cette requête ne renverra tous les signalements
 * que si l'utilisateur est authentifié avec le rôle 'moderateur' ou 'admin'.
 *
 * @returns Liste complète des signalements ou message d'erreur en français
 */
export async function getAllReportsForModeration(): Promise<
  ServiceResponse<Report[]>
> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id"
      )
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42501") {
        return {
          data: null,
          error: "Action non autorisée. Réservé aux modérateurs.",
        };
      }

      return {
        data: null,
        error: "Impossible de charger les signalements pour la modération.",
      };
    }

    return {
      data: (data as Report[]) ?? [],
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Une erreur inattendue est survenue lors du chargement des signalements.",
    };
  }
}

