import { NextRequest } from "next/server";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createReportSchema, reportQuerySchema } from "@/lib/validations";

/**
 * GET /api/reports
 * Liste paginée des signalements avec filtres (catégorie, statut, recherche textuelle, bbox).
 * Respecte les règles RLS Supabase (les anonymes ne voient que les signalements validés).
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsedQuery = reportQuerySchema.safeParse(searchParams);

    if (!parsedQuery.success) {
      return jsonError(
        "INVALID_QUERY_PARAMS",
        "Paramètres de requête invalides.",
        400,
        parsedQuery.error.format()
      );
    }

    const { page, limit, category, status, q, bbox, order } = parsedQuery.data;
    const supabase = createServerSupabaseClient(req);

    let query = supabase
      .from("reports")
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id",
        { count: "exact" }
      );

    if (category) {
      query = query.eq("category", category);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      query = query
        .gte("longitude", minLng)
        .lte("longitude", maxLng)
        .gte("latitude", minLat)
        .lte("latitude", maxLat);
    }

    const offset = (page - 1) * limit;
    query = query
      .order("created_at", { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return jsonError(
        "DATABASE_ERROR",
        "Impossible de récupérer les signalements.",
        500
      );
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return jsonOk(data ?? [], 200, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch {
    return jsonError(
      "INTERNAL_SERVER_ERROR",
      "Une erreur inattendue est survenue.",
      500
    );
  }
}

/**
 * POST /api/reports
 * Création d'un nouveau signalement citoyen.
 * Statut forcé à 'en_attente', user_id renseigné si l'utilisateur est authentifié.
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError(
        "INVALID_JSON",
        "Le corps de la requête doit être un JSON valide.",
        400
      );
    }

    const parsedBody = createReportSchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "VALIDATION_ERROR",
        "Données de signalement non conformes.",
        422,
        parsedBody.error.format()
      );
    }

    const { user } = await getAuthUser(req);
    const supabase = createServerSupabaseClient(req);

    const reportData = {
      title: parsedBody.data.title,
      description: parsedBody.data.description,
      category: parsedBody.data.category,
      latitude: parsedBody.data.latitude,
      longitude: parsedBody.data.longitude,
      status: "en_attente" as const,
      user_id: user ? user.id : null,
    };

    const { data, error } = await supabase
      .from("reports")
      .insert(reportData)
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id"
      )
      .single();

    if (error) {
      return jsonError(
        "INSERTION_FAILED",
        "Impossible d'enregistrer le signalement.",
        500
      );
    }

    return jsonOk(data, 201);
  } catch {
    return jsonError(
      "INTERNAL_SERVER_ERROR",
      "Une erreur inattendue est survenue lors de l'enregistrement.",
      500
    );
  }
}
