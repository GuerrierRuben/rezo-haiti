import { NextRequest } from "next/server";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api-helpers";
import { extractClientIp, hashIp, isRateLimited } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";
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
 * Création d'un nouveau signalement citoyen sécurisé contre le spam.
 * 
 * Pipeline de sécurité :
 * 1. Validation du corps via le schéma Zod (bornes d'Haïti, longueur du texte) -> 422
 * 2. Détection Honeypot (champ 'website' rempli par un robot) -> 200 silencieux
 * 3. Limitation de fréquence (Rate Limit) : max 5 soumissions par IP salée par 10 minutes -> 429
 * 4. Insertion via client Supabase d'administration avec statut forcé à 'en_attente'
 * 5. Nettoyage asynchrone des journaux de plus de 24 heures
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

    // 1. Détection Honeypot : si le champ caché 'website' est renseigné, répondre avec un faux succès
    if (
      body &&
      typeof body === "object" &&
      "website" in body &&
      Boolean((body as { website: unknown }).website)
    ) {
      return jsonOk(
        {
          id: crypto.randomUUID(),
          title: "Signalement enregistré",
          status: "en_attente",
          created_at: new Date().toISOString(),
        },
        200
      );
    }

    // 2. Validation Zod stricte du corps de la requête
    const parsedBody = createReportSchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "VALIDATION_ERROR",
        "Données de signalement non conformes.",
        422,
        parsedBody.error.format()
      );
    }

    // 3. Limitation de débit (Rate Limiting) basée sur le hash d'IP salé
    const clientIp = extractClientIp(req.headers);
    const ipHash = hashIp(clientIp);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabaseAdmin
      .from("submission_log")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", tenMinutesAgo);

    if (countError) {
      // Si la table de journalisation est inaccessible, on consigne et on continue sans bloquer
    } else if (isRateLimited(count ?? 0)) {
      const response = jsonError(
        "RATE_LIMIT_EXCEEDED",
        "Trop de signalements envoyés, réessayez dans quelques minutes.",
        429
      );
      response.headers.set("Retry-After", "600");
      return response;
    }

    // 4. Authentification optionnelle (assignation de user_id si connecté)
    const { user } = await getAuthUser(req);

    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();

    const reportData = {
      id: reportId,
      title: parsedBody.data.title,
      description: parsedBody.data.description,
      category: parsedBody.data.category,
      latitude: parsedBody.data.latitude,
      longitude: parsedBody.data.longitude,
      status: "en_attente" as const,
      user_id: user ? user.id : null,
      created_at: now,
      updated_at: now,
    };

    // 5. Insertion du signalement via le client d'administration sécurisé
    const { data: insertedReport, error: insertError } = await supabaseAdmin
      .from("reports")
      .insert(reportData)
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id"
      )
      .single();

    if (insertError) {
      return jsonError(
        "INSERTION_FAILED",
        "Impossible d'enregistrer le signalement.",
        500
      );
    }

    // 6. Enregistrement dans le journal des soumissions (pour le calcul du rate limit)
    await supabaseAdmin.from("submission_log").insert({
      ip_hash: ipHash,
    });

    // 7. Nettoyage opportuniste des journaux de plus de 24 heures
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();
    void supabaseAdmin
      .from("submission_log")
      .delete()
      .lt("created_at", twentyFourHoursAgo);

    return jsonOk(insertedReport ?? reportData, 201);
  } catch {
    return jsonError(
      "INTERNAL_SERVER_ERROR",
      "Une erreur inattendue est survenue lors de l'enregistrement.",
      500
    );
  }
}
