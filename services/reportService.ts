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
 * Générateur d'identifiant UUID universel compatible navigateur et Node.js.
 */
function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Crée un nouveau signalement dans la table reports via Supabase.
 * Le statut initial est systématiquement forcé à 'en_attente'.
 *
 * Tente d'abord de retourner l'enregistrement via .select().single().
 * Si la sécurité niveau ligne (RLS) bloque le RETURNING pour les utilisateurs anonymes,
 * procède à une insertion sans RETURNING avec identifiant pré-généré pour garantir la création.
 *
 * @param input Données nécessaires à la création du signalement
 * @returns Le signalement créé ou un message d'erreur en français
 */
export async function createReport(
  input: CreateReportInput
): Promise<ServiceResponse<Report>> {
  try {
    const id = generateUUID();
    const now = new Date().toISOString();

    const reportData = {
      id,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      latitude: input.latitude,
      longitude: input.longitude,
      status: "en_attente" as const,
    };

    // Tentative d'insertion avec sélection directe (.select().single())
    const { data, error } = await supabase
      .from("reports")
      .insert(reportData)
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id"
      )
      .single();

    if (error) {
      // Si la RLS Postgres (code 42501) empêche RETURNING pour un signalement 'en_attente' non authentifié,
      // on réalise l'insertion directe sans RETURNING pour respecter la politique RLS INSERT.
      if (error.code === "42501") {
        const { error: insertError } = await supabase
          .from("reports")
          .insert(reportData);

        if (insertError) {
          return {
            data: null,
            error: "Impossible d'enregistrer le signalement. Veuillez vérifier votre connexion.",
          };
        }

        return {
          data: {
            ...reportData,
            created_at: now,
            updated_at: now,
            user_id: null,
          },
          error: null,
        };
      }

      return {
        data: null,
        error: "Impossible d'enregistrer le signalement.",
      };
    }

    return {
      data: data as Report,
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

