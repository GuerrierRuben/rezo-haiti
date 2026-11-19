import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock des dépendances serveur
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === "submission_log") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn().mockResolvedValue({ count: mockSubmissionCount, error: null }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        lt: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
  }

  // table === "reports"
  return {
    insert: mockInsert.mockReturnValue({
      select: mockSelect.mockReturnValue({
        single: mockSingle,
      }),
    }),
  };
});

let mockSubmissionCount = 0;

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
  extractBearerToken: vi.fn(() => null),
}));

// Import après les mocks
import { POST } from "@/app/api/reports/route";

describe("Route POST /api/reports", () => {
  const validPayload = {
    title: "Tuyau rompu Carrefour",
    description: "Fuite majeure provoquant une coupure d'eau dans tout le quartier.",
    category: "eau",
    latitude: 18.54,
    longitude: -72.34,
    website: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmissionCount = 0;
    mockSingle.mockResolvedValue({
      data: {
        id: "rep-123",
        ...validPayload,
        status: "en_attente",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: null,
      },
      error: null,
    });
  });

  it("enregistre un signalement valide et retourne 201", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.title).toBe(validPayload.title);
    expect(json.data.status).toBe("en_attente");
  });

  it("retourne 422 avec message en français en cas de données invalides", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        title: "X", // trop court
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("détecte le champ honeypot et simule un succès 200 sans insertion en base", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        website: "http://spam-bot-link.com", // robot piégé
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    // L'insertion dans la table reports ne doit PAS avoir été appelée
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("retourne 429 avec Retry-After lorsque le taux de requêtes dépasse 5 soumissions", async () => {
    mockSubmissionCount = 5; // Limite atteinte

    const req = new NextRequest("http://localhost:3000/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "190.115.34.88",
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("600");

    const json = await res.json();
    expect(json.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(json.error.message).toContain("Trop de signalements envoyés");
  });

  it("gère les erreurs internes sans faire fuiter de détail SQL brut", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "syntax error at or near 'SELECT'", code: "42601" },
    });

    const req = new NextRequest("http://localhost:3000/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error.message).toBe("Impossible d'enregistrer le signalement.");
    expect(JSON.stringify(json)).not.toContain("42601");
    expect(JSON.stringify(json)).not.toContain("syntax error");
  });
});
