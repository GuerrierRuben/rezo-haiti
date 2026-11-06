/**
 * Catégories autorisées pour les signalements d'infrastructure et de services.
 */
export type ReportCategory = "eau" | "electricite" | "route" | "sante";

/**
 * Statuts possibles pour le suivi d'un signalement.
 */
export type ReportStatus = "en_attente" | "valide" | "resolu";

/**
 * Interface représentant un signalement dans la base de données.
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
}

/**
 * Type pour la création d'un nouveau signalement (champs générés exclus).
 */
export type CreateReportInput = Omit<Report, "id" | "status" | "created_at"> & {
  status?: ReportStatus;
};
