import { describe, expect, it } from "vitest";
import {
  HAITI_BBOX,
  REPORT_CATEGORIES,
  createReportSchema,
  updateReportSchema,
} from "@/lib/validations";

describe("Validation Zod : createReportSchema", () => {
  const validReportData = {
    title: "Fuite d'eau importante",
    description: "Canalisation rompue déversant de l'eau sur la chaussée.",
    category: "eau" as const,
    latitude: 18.5392,
    longitude: -72.335,
  };

  it("valide un signalement citoyen conforme", () => {
    const result = createReportSchema.safeParse(validReportData);
    expect(result.success).toBe(true);
  });

  it("rejette un titre de moins de 3 caractères", () => {
    const result = createReportSchema.safeParse({
      ...validReportData,
      title: "Ab",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "Le titre doit comporter au moins 3 caractères"
      );
    }
  });

  it("rejette une description de moins de 10 caractères", () => {
    const result = createReportSchema.safeParse({
      ...validReportData,
      description: "Court",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "La description doit comporter au moins 10 caractères"
      );
    }
  });

  it("rejette une catégorie inconnue", () => {
    const result = createReportSchema.safeParse({
      ...validReportData,
      category: "inconnue",
    });
    expect(result.success).toBe(false);
  });

  it("accepte chacune des 4 catégories officielles", () => {
    for (const cat of REPORT_CATEGORIES) {
      const res = createReportSchema.safeParse({
        ...validReportData,
        category: cat,
      });
      expect(res.success).toBe(true);
    }
  });

  it("rejette une latitude en dehors des bornes d'Haïti (< 17.9 ou > 20.2)", () => {
    const tooSouth = createReportSchema.safeParse({
      ...validReportData,
      latitude: 17.5,
    });
    expect(tooSouth.success).toBe(false);

    const tooNorth = createReportSchema.safeParse({
      ...validReportData,
      latitude: 21.0,
    });
    expect(tooNorth.success).toBe(false);
  });

  it("rejette une longitude en dehors des bornes d'Haïti (< -74.6 ou > -71.6)", () => {
    const tooWest = createReportSchema.safeParse({
      ...validReportData,
      longitude: -75.0,
    });
    expect(tooWest.success).toBe(false);

    const tooEast = createReportSchema.safeParse({
      ...validReportData,
      longitude: -70.0,
    });
    expect(tooEast.success).toBe(false);
  });

  it("valide les coordonnées extrêmes de la bounding box d'Haïti", () => {
    const atMinBounds = createReportSchema.safeParse({
      ...validReportData,
      latitude: HAITI_BBOX.LAT_MIN,
      longitude: HAITI_BBOX.LNG_MIN,
    });
    expect(atMinBounds.success).toBe(true);

    const atMaxBounds = createReportSchema.safeParse({
      ...validReportData,
      latitude: HAITI_BBOX.LAT_MAX,
      longitude: HAITI_BBOX.LNG_MAX,
    });
    expect(atMaxBounds.success).toBe(true);
  });
});

describe("Validation Zod : updateReportSchema", () => {
  it("valide une mise à jour partielle du statut", () => {
    const result = updateReportSchema.safeParse({
      status: "valide",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un statut invalide", () => {
    const result = updateReportSchema.safeParse({
      status: "rejete",
    });
    expect(result.success).toBe(false);
  });
});
