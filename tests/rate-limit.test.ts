import { describe, expect, it } from "vitest";
import {
  extractClientIp,
  hashIp,
  isRateLimited,
  RATE_LIMIT_MAX_SUBMISSIONS,
} from "@/lib/rate-limit";

describe("Logique Anti-Spam & Rate Limiting", () => {
  describe("hashIp()", () => {
    it("génère une empreinte SHA-256 déterministe pour une IP et un sel donnés", () => {
      const hash1 = hashIp("190.115.34.12", "mon-sel-secret");
      const hash2 = hashIp("190.115.34.12", "mon-sel-secret");
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it("génère des hash distincts pour deux adresses IP différentes", () => {
      const hashA = hashIp("190.115.34.12", "sel-test");
      const hashB = hashIp("190.115.34.13", "sel-test");
      expect(hashA).not.toBe(hashB);
    });

    it("génère des hash distincts pour la même IP avec deux sels différents", () => {
      const hash1 = hashIp("190.115.34.12", "sel-alpha");
      const hash2 = hashIp("190.115.34.12", "sel-beta");
      expect(hash1).not.toBe(hash2);
    });

    it("ne fait pas fuiter l'adresse IP en clair dans le hash", () => {
      const ip = "190.115.34.12";
      const hash = hashIp(ip, "mon-sel");
      expect(hash).not.toContain(ip);
    });
  });

  describe("extractClientIp()", () => {
    it("extrait la première adresse de x-forwarded-for en présence de proxys multiples", () => {
      const headers = new Headers({
        "x-forwarded-for": "190.115.34.12, 10.0.0.1, 172.16.0.1",
      });
      expect(extractClientIp(headers)).toBe("190.115.34.12");
    });

    it("extrait l'adresse depuis x-real-ip en l'absence de x-forwarded-for", () => {
      const headers = new Headers({
        "x-real-ip": "190.115.34.55",
      });
      expect(extractClientIp(headers)).toBe("190.115.34.55");
    });

    it("retourne 127.0.0.1 par défaut si aucun en-tête n'est présent", () => {
      const headers = new Headers();
      expect(extractClientIp(headers)).toBe("127.0.0.1");
    });
  });

  describe("isRateLimited()", () => {
    it("autorise les soumissions sous le seuil maximal (0 à 4 soumissions)", () => {
      expect(isRateLimited(0)).toBe(false);
      expect(isRateLimited(1)).toBe(false);
      expect(isRateLimited(RATE_LIMIT_MAX_SUBMISSIONS - 1)).toBe(false);
    });

    it("bloque exactement au seuil maximal (5 soumissions)", () => {
      expect(isRateLimited(RATE_LIMIT_MAX_SUBMISSIONS)).toBe(true);
    });

    it("bloque au-delà du seuil maximal (> 5 soumissions)", () => {
      expect(isRateLimited(RATE_LIMIT_MAX_SUBMISSIONS + 1)).toBe(true);
      expect(isRateLimited(10)).toBe(true);
    });
  });
});
