/**
 * Métadonnées de pagination retournées dans les réponses de liste.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Réponse d'API en cas de succès avec données typées et métadonnées optionnelles.
 */
export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

/**
 * Détail d'une erreur d'API standardisée.
 */
export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Réponse d'API en cas d'erreur standardisée.
 */
export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

/**
 * Type union générique représentant toute réponse de l'API Rezo Ayiti.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Réponse paginée standard contenant un tableau d'éléments et les métadonnées.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
