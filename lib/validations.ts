import { z } from "zod";

/**
 * Coordonnées géographiques de la bounding box d'Haïti.
 * Latitude : de 17.9 à 20.2 (Sud vers Nord)
 * Longitude : de -74.6 à -71.6 (Ouest vers Est)
 */
export const HAITI_BBOX = {
  LAT_MIN: 17.9,
  LAT_MAX: 20.2,
  LNG_MIN: -74.6,
  LNG_MAX: -71.6,
} as const;

/**
 * Liste des catégories valides de signalement.
 */
export const REPORT_CATEGORIES = [
  "eau",
  "electricite",
  "route",
  "sante",
] as const;

/**
 * Liste des statuts valides de signalement.
 */
export const REPORT_STATUSES = ["en_attente", "valide", "resolu"] as const;

/**
 * Validation de la latitude dans la bounding box d'Haïti.
 */
const latitudeSchema = z
  .number()
  .min(
    HAITI_BBOX.LAT_MIN,
    `La latitude minimale pour Haïti est ${HAITI_BBOX.LAT_MIN}.`
  )
  .max(
    HAITI_BBOX.LAT_MAX,
    `La latitude maximale pour Haïti est ${HAITI_BBOX.LAT_MAX}.`
  );

/**
 * Validation de la longitude dans la bounding box d'Haïti.
 */
const longitudeSchema = z
  .number()
  .min(
    HAITI_BBOX.LNG_MIN,
    `La longitude minimale pour Haïti est ${HAITI_BBOX.LNG_MIN}.`
  )
  .max(
    HAITI_BBOX.LNG_MAX,
    `La longitude maximale pour Haïti est ${HAITI_BBOX.LNG_MAX}.`
  );

/**
 * Schéma de création d'un signalement citoyen.
 */
export const createReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Le titre doit comporter au moins 3 caractères.")
    .max(255, "Le titre ne peut pas dépasser 255 caractères."),
  description: z
    .string()
    .trim()
    .min(10, "La description doit comporter au moins 10 caractères.")
    .max(5000, "La description ne peut pas dépasser 5000 caractères."),
  category: z.enum(REPORT_CATEGORIES),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export type CreateReportSchema = z.infer<typeof createReportSchema>;

/**
 * Schéma de mise à jour / modération d'un signalement.
 */
export const updateReportSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Le titre doit comporter au moins 3 caractères.")
      .max(255, "Le titre ne peut pas dépasser 255 caractères.")
      .optional(),
    description: z
      .string()
      .trim()
      .min(10, "La description doit comporter au moins 10 caractères.")
      .max(5000, "La description ne peut pas dépasser 5000 caractères.")
      .optional(),
    category: z.enum(REPORT_CATEGORIES).optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    status: z.enum(REPORT_STATUSES).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "Au moins un champ doit être fourni pour la mise à jour."
  );

export type UpdateReportSchema = z.infer<typeof updateReportSchema>;

/**
 * Schéma de filtrage et pagination pour la liste des signalements.
 */
export const reportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(REPORT_CATEGORIES).optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  bbox: z
    .string()
    .regex(
      /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
      "Le format de la bbox doit être : minLng,minLat,maxLng,maxLat"
    )
    .optional(),
  sort: z.enum(["created_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ReportQuerySchema = z.infer<typeof reportQuerySchema>;

/**
 * Schéma pour la recherche spatiale de proximité (/api/reports/nearby).
 */
export const nearbyQuerySchema = z.object({
  lat: z.coerce
    .number()
    .min(HAITI_BBOX.LAT_MIN, `La latitude minimale est ${HAITI_BBOX.LAT_MIN}.`)
    .max(HAITI_BBOX.LAT_MAX, `La latitude maximale est ${HAITI_BBOX.LAT_MAX}.`),
  lng: z.coerce
    .number()
    .min(
      HAITI_BBOX.LNG_MIN,
      `La longitude minimale est ${HAITI_BBOX.LNG_MIN}.`
    )
    .max(
      HAITI_BBOX.LNG_MAX,
      `La longitude maximale est ${HAITI_BBOX.LNG_MAX}.`
    ),
  radius: z.coerce
    .number()
    .min(1, "Le rayon minimal est de 1 mètre.")
    .max(50000, "Le rayon maximal est de 50 000 mètres (50 km).")
    .default(5000),
});

export type NearbyQuerySchema = z.infer<typeof nearbyQuerySchema>;

/**
 * Schéma de mise à jour du profil utilisateur courant.
 */
export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Le nom d'affichage doit comporter au moins 2 caractères.")
    .max(100, "Le nom d'affichage ne peut pas dépasser 100 caractères."),
});

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
