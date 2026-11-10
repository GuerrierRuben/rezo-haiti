import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireRole } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateReportSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/reports/[id]
 * Récupère un signalement par son identifiant UUID.
 * Filtré automatiquement par la RLS Supabase.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return jsonError("INVALID_ID", "L'identifiant fourni est invalide.", 400);
    }

    const supabase = createServerSupabaseClient(req);
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return jsonError(
        "DATABASE_ERROR",
        "Erreur lors de la lecture du signalement.",
        500
      );
    }

    if (!data) {
      return jsonError(
        "NOT_FOUND",
        "Signalement introuvable ou non autorisé.",
        404
      );
    }

    return jsonOk(data);
  } catch {
    return jsonError(
      "INTERNAL_SERVER_ERROR",
      "Une erreur inattendue est survenue.",
      500
    );
  }
}

/**
 * PATCH /api/reports/[id]
 * Modération et mise à jour d'un signalement (changement de statut, édition de champs).
 * Réservé aux utilisateurs avec rôle 'moderateur' ou 'admin'.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(req, ["moderateur", "admin"]);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return jsonError("INVALID_ID", "L'identifiant fourni est invalide.", 400);
    }

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

    const parsedBody = updateReportSchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "VALIDATION_ERROR",
        "Données de mise à jour non conformes.",
        422,
        parsedBody.error.format()
      );
    }

    const supabase = createServerSupabaseClient(req);
    const { data, error } = await supabase
      .from("reports")
      .update(parsedBody.data)
      .eq("id", id)
      .select(
        "id, title, description, category, latitude, longitude, status, created_at, updated_at, user_id"
      )
      .maybeSingle();

    if (error) {
      return jsonError(
        "DATABASE_ERROR",
        "Échec de la mise à jour du signalement.",
        500
      );
    }

    if (!data) {
      return jsonError(
        "NOT_FOUND",
        "Signalement introuvable pour la mise à jour.",
        404
      );
    }

    return jsonOk(data);
  } catch {
    return jsonError(
      "INTERNAL_SERVER_ERROR",
      "Une erreur inattendue est survenue lors de la mise à jour.",
      500
    );
  }
}

/**
 * DELETE /api/reports/[id]
 * Suppression définitive d'un signalement.
 * Réservé aux utilisateurs avec rôle 'moderateur' ou 'admin'.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(req, ["moderateur", "admin"]);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return jsonError("INVALID_ID", "L'identifiant fourni est invalide.", 400);
    }

    const supabase = createServerSupabaseClient(req);
    const { error, count } = await supabase
      .from("reports")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      return jsonError(
        "DATABASE_ERROR",
        "Échec de la suppression du signalement.",
        500
      );
    }

    if (count === 0) {
      return jsonError(
        "NOT_FOUND",
        "Signalement introuvable ou déjà supprimé.",
        404
      );
    }

    return jsonOk({ message: "Signalement supprimé avec succès." });
  } catch {
    return jsonError(
      "INTERNAL_SERVER_ERROR",
      "Une erreur inattendue est survenue lors de la suppression.",
      500
    );
  }
}
