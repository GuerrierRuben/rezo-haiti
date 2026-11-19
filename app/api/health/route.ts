import { jsonOk } from "@/lib/api-helpers";

/**
 * GET /api/health
 * Endpoint de santé pour les sondes d'orchestration (Vercel, Uptime, Kubernetes).
 */
export async function GET() {
  return jsonOk({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
