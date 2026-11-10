/**
 * Catégories autorisées pour les signalements d'infrastructure et de services publics.
 */
export type ReportCategory = "eau" | "electricite" | "route" | "sante";

/**
 * Statuts de modération et de cycle de vie d'un signalement.
 */
export type ReportStatus = "en_attente" | "valide" | "resolu";

/**
 * Interface représentant un signalement stocké dans la table reports.
 */
export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  latitude: number;
  longitude: number;
  status: ReportStatus;
  created_at: string;
  updated_at?: string;
  user_id?: string | null;
  location?: unknown;
}

/**
 * Signalement enrichi avec la distance calculée en mètres (pour la recherche spatiale).
 */
export interface ReportWithDistance extends Report {
  distance_meters: number;
}

/**
 * Données requises pour la création d'un signalement.
 */
export type CreateReportInput = {
  title: string;
  description: string;
  category: ReportCategory;
  latitude: number;
  longitude: number;
};

/**
 * Données autorisées pour la modération ou mise à jour d'un signalement.
 */
export type UpdateReportInput = {
  title?: string;
  description?: string;
  category?: ReportCategory;
  latitude?: number;
  longitude?: number;
  status?: ReportStatus;
};
