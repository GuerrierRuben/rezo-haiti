/**
 * Point d'entrée unique pour tous les types du projet Rezo Ayiti.
 * Centralise les définitions des signalements, des profils utilisateurs et des réponses d'API.
 */

// Types liés aux signalements (reports)
export type {
  ReportCategory,
  ReportStatus,
  Report,
  ReportWithDistance,
  CreateReportInput,
  UpdateReportInput,
} from "./report";

// Types liés aux profils et rôles utilisateurs (profiles)
export type { UserRole, Profile, UpdateProfileInput } from "./profile";

// Types standardisés pour les réponses API
export type {
  PaginationMeta,
  ApiSuccessResponse,
  ApiErrorDetail,
  ApiErrorResponse,
  ApiResponse,
  PaginatedResponse,
} from "./api";
