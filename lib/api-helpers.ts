import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "@/types/api";
import type { Profile, UserRole } from "@/types/profile";

/**
 * Retourne une réponse JSON standardisée de succès.
 */
export function jsonOk<T>(
  data: T,
  status = 200,
  meta?: PaginationMeta | Record<string, unknown>
): NextResponse<ApiSuccessResponse<T>> {
  const payload: ApiSuccessResponse<T> = { data };
  if (meta) {
    payload.meta = meta;
  }
  return NextResponse.json(payload, { status });
}

/**
 * Retourne une réponse JSON standardisée d'erreur.
 */
export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const payload: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return NextResponse.json(payload, { status });
}

/**
 * Récupère l'utilisateur connecté et son profil associé à partir du Bearer token de la requête.
 */
export async function getAuthUser(req: Request): Promise<{
  user: User | null;
  profile: Profile | null;
}> {
  const supabase = createServerSupabaseClient(req);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { user, profile: null };
  }

  return { user, profile: profile as Profile };
}

/**
 * Vérifie qu'un utilisateur est authentifié et possède l'un des rôles autorisés.
 * Retourne l'utilisateur et son profil en cas de succès, ou une réponse NextResponse d'erreur (401/403).
 */
export async function requireRole(
  req: Request,
  allowedRoles: UserRole[]
): Promise<
  | { user: User; profile: Profile; response?: never }
  | { user?: never; profile?: never; response: NextResponse<ApiErrorResponse> }
> {
  const { user, profile } = await getAuthUser(req);

  if (!user) {
    return {
      response: jsonError(
        "UNAUTHORIZED",
        "Authentification requise pour effectuer cette action.",
        401
      ),
    };
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return {
      response: jsonError(
        "FORBIDDEN",
        "Vous n'avez pas les autorisations nécessaires pour cette ressource.",
        403
      ),
    };
  }

  return { user, profile };
}
