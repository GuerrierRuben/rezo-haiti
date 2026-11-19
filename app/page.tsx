"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createReport, getReports } from "@/services/reportService";
import { HAITI_BBOX, createReportSchema } from "@/lib/validations";
import type { Report, ReportCategory, ReportStatus } from "@/types";

/**
 * Chargement dynamique de la carte interactive Leaflet sans SSR (côté client uniquement).
 */
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] sm:h-[480px] lg:h-[560px] w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <svg
        className="h-8 w-8 animate-spin text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
        Chargement de la carte d&apos;Haïti...
      </p>
    </div>
  ),
});

/**
 * Configuration visuelle des catégories de signalement.
 */
const CATEGORY_CONFIG: Record<
  ReportCategory,
  { label: string; icon: string; badgeClass: string }
> = {
  eau: {
    label: "Eau",
    icon: "💧",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  electricite: {
    label: "Électricité",
    icon: "⚡",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  route: {
    label: "Route / Infrastructure",
    icon: "🛣️",
    badgeClass: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  },
  sante: {
    label: "Santé / Urgence",
    icon: "🏥",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
};

/**
 * Configuration visuelle des statuts de modération.
 */
const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; badgeClass: string }
> = {
  en_attente: {
    label: "En attente",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  valide: {
    label: "Validé",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  resolu: {
    label: "Résolu",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  },
};

export default function HomePage() {
  // Liste des signalements publics affichés
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Champs du formulaire de signalement
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<ReportCategory>("eau");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null
  );

  // État de soumission et erreurs
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  /**
   * Charge la liste des signalements via reportService.
   */
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    const { data, error } = await getReports({ limit: 50 });

    if (error) {
      setFetchError(error);
    } else {
      setReports(data ?? []);
    }

    setIsLoading(false);
  }, []);

  // Chargement initial des signalements au montage (sans setState synchrone)
  useEffect(() => {
    let isMounted = true;

    const fetchInitial = async () => {
      const { data, error } = await getReports({ limit: 50 });
      if (!isMounted) return;

      if (error) {
        setFetchError(error);
      } else {
        setReports(data ?? []);
      }
      setIsLoading(false);
    };

    void fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Gestion de la sélection de coordonnées au clic sur la carte.
   * Valide que le clic se situe à l'intérieur de la boîte englobante d'Haïti.
   */
  const handleSelectPosition = useCallback((lat: number, lng: number) => {
    // Vérification des frontières géographiques d'Haïti
    if (
      lat < HAITI_BBOX.LAT_MIN ||
      lat > HAITI_BBOX.LAT_MAX ||
      lng < HAITI_BBOX.LNG_MIN ||
      lng > HAITI_BBOX.LNG_MAX
    ) {
      setPosition(null);
      setFieldErrors((prev) => ({
        ...prev,
        position:
          "La position sélectionnée est en dehors des limites d'Haïti (latitude 17.9 à 20.2, longitude -74.6 à -71.6).",
      }));
      setFeedback({
        type: "error",
        text: "La position sélectionnée est en dehors des limites d'Haïti (lat 17.9 à 20.2, lng -74.6 à -71.6). Veuillez cliquer sur le territoire haïtien.",
      });
      return;
    }

    // Coordonnées valides : mise à jour de la position et effacement des erreurs associées
    setPosition({ lat, lng });
    setFieldErrors((prev) => {
      if (!prev.position) return prev;
      const next = { ...prev };
      delete next.position;
      return next;
    });
    setFeedback(null);
  }, []);

  /**
   * Efface l'emplacement géographique actuellement sélectionné.
   */
  const handleClearPosition = () => {
    setPosition(null);
    setFieldErrors((prev) => {
      if (!prev.position) return prev;
      const next = { ...prev };
      delete next.position;
      return next;
    });
  };

  /**
   * Soumission du formulaire citoyen avec validation complète Zod.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    const errors: Record<string, string> = {};

    // Vérification stricte de la position (position !== null)
    if (position === null) {
      errors.position =
        "Veuillez sélectionner un emplacement sur la carte en cliquant dessus.";
    }

    // Validation via le schéma Zod partagé
    const validation = createReportSchema.safeParse({
      title,
      description,
      category,
      latitude: position !== null ? position.lat : undefined,
      longitude: position !== null ? position.lng : undefined,
    });

    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0];
        if (typeof fieldName === "string" && !errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      }
    }

    // S'il y a des erreurs, on les affiche et on interrompt l'envoi
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    // Envoi des données via le service centralisé (position vérifiée non nulle ci-dessus)
    const { data, error } = await createReport({
      title: title.trim(),
      description: description.trim(),
      category,
      latitude: position!.lat,
      longitude: position!.lng,
    });

    if (error) {
      setFeedback({
        type: "error",
        text: error,
      });
      setIsSubmitting(false);
      return;
    }

    // Succès de l'insertion : réinitialisation complète du formulaire et de la sélection
    setTitle("");
    setDescription("");
    setCategory("eau");
    setPosition(null);

    // Rechargement des signalements publics
    const { data: updatedReports, error: fetchErr } = await getReports({
      limit: 50,
    });

    if (fetchErr) {
      setFetchError(fetchErr);
    } else {
      setReports(updatedReports ?? []);
    }

    // Gestion du retour utilisateur tenant compte des règles de sécurité (RLS)
    const isVisible = updatedReports?.some((r) => r.id === data?.id);
    if (isVisible) {
      setFeedback({
        type: "success",
        text: "Signalement envoyé avec succès et affiché sur la carte !",
      });
    } else {
      // Les signalements 'en_attente' ne sont pas visibles publiquement avant modération
      setFeedback({
        type: "success",
        text: "Signalement envoyé, il apparaîtra sur la carte après validation par un modérateur.",
      });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* En-tête de la plateforme */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center space-x-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Rezo Ayiti
            </span>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            🇭🇹 Haïti • Plateforme Citoyenne
          </span>
        </div>
      </header>

      {/* Contenu principal - Grille Responsive Mobile-First */}
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Titre et introduction */}
          <div className="mb-6">
            <div className="mb-2 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              Cartographie Participative &amp; Signalement Public
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
              Signalement des Infrastructures &amp; Services Publics
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Cliquez sur la carte pour désigner un emplacement géographique précis, remplissez les informations et participez à l&apos;amélioration des services en Haïti.
            </p>
          </div>

          {/* Grille principale :
              - Sur mobile : Carte en premier (order-1), Formulaire en second (order-2)
              - Sur grand écran : Formulaire à gauche (lg:order-1 lg:col-span-5), Carte à droite (lg:order-2 lg:col-span-7)
          */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
            {/* Colonne Formulaire de Signalement */}
            <div className="order-2 lg:order-1 lg:col-span-5">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Nouveau signalement
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tous les champs sont requis. Cliquez sur la carte pour définir les coordonnées.
                  </p>
                </div>

                {/* Message de notification (succès ou erreur) */}
                {feedback && (
                  <div
                    role="alert"
                    className={`mb-4 rounded-lg p-3 text-xs sm:text-sm ${
                      feedback.type === "success"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none">
                        {feedback.type === "success" ? "✅" : "❌"}
                      </span>
                      <p className="font-medium leading-relaxed">{feedback.text}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Champ Titre */}
                  <div>
                    <label
                      htmlFor="report-title"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Titre du signalement <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="report-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Ex: Tuyau d'eau principal rompu..."
                      maxLength={255}
                      className={`mt-1 block w-full rounded-lg border px-3 py-2 text-xs sm:text-sm shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-white ${
                        fieldErrors.title
                          ? "border-red-300 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:bg-red-950/20"
                          : "border-slate-300 bg-white text-slate-900 focus:border-blue-500 dark:border-slate-700"
                      }`}
                    />
                    {fieldErrors.title && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.title}
                      </p>
                    )}
                  </div>

                  {/* Champ Catégorie */}
                  <div>
                    <label
                      htmlFor="report-category"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Catégorie d&apos;infrastructure <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="report-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ReportCategory)}
                      disabled={isSubmitting}
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="eau">💧 Eau</option>
                      <option value="electricite">⚡ Électricité</option>
                      <option value="route">🛣️ Route / Infrastructure</option>
                      <option value="sante">🏥 Santé / Urgence</option>
                    </select>
                    {fieldErrors.category && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.category}
                      </p>
                    )}
                  </div>

                  {/* Champ Description */}
                  <div>
                    <label
                      htmlFor="report-description"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Description détaillée <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="report-description"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Décrivez précisément la situation, les repères visuels, l'impact sur les riverains (min. 10 caractères)..."
                      maxLength={5000}
                      className={`mt-1 block w-full rounded-lg border px-3 py-2 text-xs sm:text-sm shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-white ${
                        fieldErrors.description
                          ? "border-red-300 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:bg-red-950/20"
                          : "border-slate-300 bg-white text-slate-900 focus:border-blue-500 dark:border-slate-700"
                      }`}
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {fieldErrors.description ? (
                          <span className="text-red-600 dark:text-red-400">
                            {fieldErrors.description}
                          </span>
                        ) : (
                          "Minimum 10 caractères"
                        )}
                      </span>
                      <span>{description.length} / 5000</span>
                    </div>
                  </div>

                  {/* Indicateur d'emplacement géographique */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Position géographique sur la carte <span className="text-red-500">*</span>
                    </label>

                    {position !== null ? (
                      <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="text-sm">📍</span>
                          <span>
                            Lat : {position.lat.toFixed(5)} • Lng : {position.lng.toFixed(5)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearPosition}
                          disabled={isSubmitting}
                          title="Effacer la sélection"
                          className="font-semibold text-xs text-red-600 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          Effacer la position
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        <span className="text-sm">⚠️</span>
                        <span>
                          Aucune position sélectionnée. Cliquez directement sur la carte pour placer le repère.
                        </span>
                      </div>
                    )}

                    {fieldErrors.position && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.position}
                      </p>
                    )}
                  </div>

                  {/* Bouton de Soumission */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-xs text-white shadow-xs transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 animate-spin text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                          Envoi en cours...
                        </span>
                      ) : (
                        "Soumettre le signalement"
                      )}
                    </button>
                  </div>
                </form>
              </section>
            </div>

            {/* Colonne Carte Interactive Leaflet */}
            <div className="order-1 lg:order-2 lg:col-span-7">
              <section className="flex flex-col">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                      Carte interactive
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      <span>🗺️</span>
                      <span>
                        {reports.length} point{reports.length > 1 ? "s" : ""}
                      </span>
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    💡 Cliquez sur la carte pour définir l&apos;emplacement
                  </span>
                </div>

                {/* Composant cartographique avec sélection au clic et marqueur temporaire */}
                <MapComponent
                  reports={reports}
                  selectedPosition={position}
                  onSelectPosition={handleSelectPosition}
                  className="h-[360px] sm:h-[440px] lg:h-[540px] w-full rounded-xl border border-slate-200 shadow-xs overflow-hidden dark:border-slate-800"
                />
              </section>
            </div>
          </div>

          {/* Section Liste des Derniers Signalements Publics */}
          <section className="mt-10 lg:mt-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                  Signalements récents
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Signalements validés et visibles publiquement sur la plateforme.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadReports}
                  disabled={isLoading}
                  title="Rafraîchir les signalements"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
                >
                  🔄 Rafraîchir
                </button>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {reports.length} affiché{reports.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* État : Chargement */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <svg
                  className="h-6 w-6 animate-spin text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Chargement des signalements en cours...
                </p>
              </div>
            )}

            {/* État : Erreur de récupération */}
            {!isLoading && fetchError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-800 shadow-xs dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
                <p className="font-semibold text-xs sm:text-sm">
                  Erreur de chargement : {fetchError}
                </p>
                <button
                  type="button"
                  onClick={loadReports}
                  className="mt-3 inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* État : Aucun signalement public disponible */}
            {!isLoading && !fetchError && reports.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-3xl" role="img" aria-label="Information">
                  📋
                </span>
                <p className="mt-2 font-semibold text-sm">
                  Aucun signalement visible pour le moment
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                  En vertu des règles de sécurité (RLS), les nouveaux signalements reçoivent le statut initial « en attente » et apparaissent publiquement dès validation par un modérateur.
                </p>
              </div>
            )}

            {/* État : Liste des signalements */}
            {!isLoading && !fetchError && reports.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) => {
                  const categoryInfo = CATEGORY_CONFIG[report.category] ?? {
                    label: report.category,
                    icon: "📌",
                    badgeClass: "bg-slate-100 text-slate-700",
                  };
                  const statusInfo = STATUS_CONFIG[report.status] ?? {
                    label: report.status,
                    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                  };

                  return (
                    <article
                      key={report.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${categoryInfo.badgeClass}`}
                          >
                            <span>{categoryInfo.icon}</span>
                            <span>{categoryInfo.label}</span>
                          </span>

                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.badgeClass}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        <h3 className="mt-2 font-bold text-sm text-slate-900 dark:text-white">
                          {report.title}
                        </h3>

                        <p className="mt-1 line-clamp-3 text-xs text-slate-600 dark:text-slate-300">
                          {report.description}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
                        <span>
                          📍 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                        </span>
                        <span>
                          {new Date(report.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p>Rezo Ayiti &copy; 2026 &mdash; Plateforme citoyenne open-source sous licence MIT.</p>
      </footer>
    </div>
  );
}
