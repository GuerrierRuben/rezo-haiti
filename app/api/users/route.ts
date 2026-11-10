import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, requireRole } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/users
 * Liste paginée de tous les profils utilisateurs.
 * Accès strictement réservé aux utilisateurs ayant le rôle 'admin'.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireRole(req, ["admin"]);
    if (authResult.response) {
      return authResult.response;
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsedQuery = usersQuerySchema.safeParse(searchParams);

    if (!parsedQuery.success) {
      return jsonError(
        "INVALID_QUERY_PARAMS",
        "Paramètres de pagination invalides.",
        400,
        parsedQuery.error.format()
      );
    }

    const { page, limit } = parsedQuery.data;
    const offset = (page - 1) * limit;
    const supabase = createServerSupabaseClient(req);

    const { data, count, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return jsonError(
        "DATABASE_ERROR",
        "Impossible de récupérer la liste des utilisateurs.",
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
