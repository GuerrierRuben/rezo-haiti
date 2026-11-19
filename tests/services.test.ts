import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock de Supabase pour les services
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

import { getReports, updateReportStatus } from "@/services/reportService";

describe("Services : reportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getReports()", () => {
    it("récupère la liste des signalements avec succès", async () => {
      const mockReports = [
        {
          id: "1",
          title: "Signalement 1",
          description: "Description 1",
          category: "eau",
          latitude: 18.5,
          longitude: -72.3,
          status: "valide",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: null,
        },
      ];

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({ data: mockReports, error: null }),
      });

      const result = await getReports({ limit: 10 });
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].title).toBe("Signalement 1");
    });

    it("gère l'erreur de base de données sans exception non capturée", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: "Connection refused" },
        }),
      });

      const result = await getReports();
      expect(result.data).toBeNull();
      expect(result.error).toBe("Impossible de récupérer les signalements.");
    });
  });

  describe("updateReportStatus()", () => {
    it("met à jour le statut d'un signalement pour un modérateur", async () => {
      const updatedReport = {
        id: "rep-1",
        title: "Test",
        status: "valide",
      };

      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: updatedReport,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await updateReportStatus("rep-1", "valide");
      expect(result.error).toBeNull();
      expect(result.data?.status).toBe("valide");
    });

    it("retourne 'Action non autorisée ou signalement introuvable.' en cas de refus RLS ou id absent", async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: null,
                error: { code: "PGRST116", message: "0 rows returned" },
              }),
            }),
          }),
        }),
      });

      const result = await updateReportStatus("rep-inexistant", "resolu");
      expect(result.data).toBeNull();
      expect(result.error).toBe("Action non autorisée ou signalement introuvable.");
    });
  });
});
