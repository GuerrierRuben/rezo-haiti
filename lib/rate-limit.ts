import crypto from "crypto";

/**
 * Sel par défaut utilisé si la variable d'environnement RATE_LIMIT_SALT n'est pas configurée.
 */
export const DEFAULT_RATE_LIMIT_SALT = "rezo-ayiti-default-secret-salt-2026";

/**
 * Nombre maximal de soumissions autorisées par tranche de 10 minutes par adresse IP.
 */
export const RATE_LIMIT_MAX_SUBMISSIONS = 5;

/**
 * Durée de la fenêtre de limitation en secondes (10 minutes = 600 secondes).
 */
export const RATE_LIMIT_WINDOW_SECONDS = 600;

/**
 * Extrait l'adresse IP cliente depuis les en-têtes standards d'une requête HTTP.
 * Supporte les proxys inversés (Vercel, Cloudflare, Nginx).
 *
 * @param headers En-têtes HTTP de la requête
 * @returns L'adresse IP détectée ou "127.0.0.1" par défaut
 */
export function extractClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  return "127.0.0.1";
}

/**
 * Calcule l'empreinte SHA-256 d'une adresse IP combinée à un sel secret.
 * Garantit qu'aucune adresse IP en clair n'est stockée en base de données (conformité RGPD / confidentialité).
 *
 * @param ip Adresse IP du client
 * @param salt Sel secret personnalisé (optionnel, utilise RATE_LIMIT_SALT par défaut)
 * @returns Chaîne hexadécimale de 64 caractères
 */
export function hashIp(ip: string, salt?: string): string {
  const secretSalt =
    salt || process.env.RATE_LIMIT_SALT || DEFAULT_RATE_LIMIT_SALT;
  return crypto
    .createHash("sha256")
    .update(`${ip.trim()}:${secretSalt}`)
    .digest("hex");
}

/**
 * Vérifie si le nombre de soumissions récentes dépasse le quota autorisé.
 *
 * @param currentCount Nombre de signalements effectués dans la fenêtre
 * @param maxAllowed Plafond maximal autorisé (défaut : 5)
 * @returns Vrai si la limite est atteinte ou dépassée
 */
export function isRateLimited(
  currentCount: number,
  maxAllowed = RATE_LIMIT_MAX_SUBMISSIONS
): boolean {
  return currentCount >= maxAllowed;
}
