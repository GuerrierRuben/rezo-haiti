import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { nearbyQuerySchema } from "@/lib/validations";
import type { ReportWithDistance } from "@/types";

/**
 * GET /api/reports/nearby
 * Recherche spatiale des signalements situés dans un rayon donné (en mètres, max 50 km).
 * Utilise la fonction SQL RPC PostGIS nearby_reports (ST_DWithin).
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsedQuery = nearbyQuerySchema.safeParse(searchParams);

    if (!parsedQuery.success) {
      return jsonError(
        "INVALID_QUERY_PARAMS",
        "Paramètres géographiques invalides.",
        400,
        parsedQuery.error.format()
      );
    }

    const { lat, lng, radius } = parsedQuery.data;
    const supabase = createServerSupabaseClient(req);

    const { data, error } = await supabase.rpc("nearby_reports", {
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: radius,
    });

    if (error) {
      return jsonError(
        "SPATIAL_QUERY_FAILED",
        "Impossible d'effectuer la recherche géographique.",
        500
      );
    }

    const reports = (data as ReportWithDistance[]) ?? [];

    return jsonOk(reports, 200, {
      center: { latitude: lat, longitude: lng },
      radius_meters: radius,
      count: reports.length,
    });
  } catch {
    return jsonError(
      "INTERNAL_SERVER_ERROR",
      "Une erreur inattendue est survenue lors de la recherche spatiale.",
      500
    );
  }
}
