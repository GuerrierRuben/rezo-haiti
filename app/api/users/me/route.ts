import { NextRequest } from "next/server";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateProfileSchema } from "@/lib/validations";

/**
 * GET /api/users/me
 * Retourne les informations du profil utilisateur connecté.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, profile } = await getAuthUser(req);

    if (!user) {
      return jsonError(
        "UNAUTHORIZED",
        "Authentification requise pour consulter votre profil.",
        401
      );
    }

    if (!profile) {
      return jsonError(
        "PROFILE_NOT_FOUND",
        "Profil introuvable pour cet utilisateur.",
        404
      );
    }

    return jsonOk(profile);
  } catch {
    return jsonError(
      "INTERNAL_SERVER_ERROR",
      "Une erreur inattendue est survenue.",
      500
    );
  }
}

/**
 * PATCH /api/users/me
 * Mise à jour du nom d'affichage (display_name) du profil de l'utilisateur connecté.
 * Le rôle est strictement immuable par cette route.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);

    if (!user) {
      return jsonError(
        "UNAUTHORIZED",
        "Authentification requise pour mettre à jour votre profil.",
        401
      );
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

    const parsedBody = updateProfileSchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "VALIDATION_ERROR",
        "Données de profil non conformes.",
        422,
        parsedBody.error.format()
      );
    }

    const supabase = createServerSupabaseClient(req);
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: parsedBody.data.display_name })
      .eq("id", user.id)
      .select("id, display_name, role, created_at")
      .single();

    if (error) {
      return jsonError(
        "DATABASE_ERROR",
        "Échec de la mise à jour du profil.",
        500
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
