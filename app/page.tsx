"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createReport, getReports } from "@/services/reportService";
import type { CreateReportInput, Report, ReportCategory, ReportStatus } from "@/types";

/**
 * Chargement dynamique de la carte interactive Leaflet sans SSR (côté client uniquement).
 */
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] min-h-[320px] w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <svg
        className="h-7 w-7 animate-spin text-blue-600"
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
        Chargement de la carte...
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
    label: "Route",
    icon: "🛣️",
    badgeClass: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  },
  sante: {
    label: "Santé",
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

/**
 * Données de test demandées pour le bouton d'envoi.
 * Cible Port-au-Prince, catégorie eau, lat 18.5392, lng -72.3350.
 */
const TEST_REPORT_INPUT: CreateReportInput = {
  title: "Tuyau cassé - Port-au-Prince",
  description:
    "Signalement test : fuite d'eau importante constatée sur la voie publique au centre-ville.",
  category: "eau",
  latitude: 18.5392,
  longitude: -72.335,
};

export default function HomePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
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

  // Chargement initial des signalements côté client
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  /**
   * Envoie un signalement test via reportService et recharge la liste.
   */
  const handleSendTestReport = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    const { data, error } = await createReport(TEST_REPORT_INPUT);

    if (error) {
      setFeedback({
        type: "error",
        message: error,
      });
    } else if (data) {
      setFeedback({
        type: "success",
        message: `Signalement envoyé avec succès ! Statut : "${data.status}" (ID : ${data.id.slice(0, 8)}...).`,
      });
      // Rechargement des signalements après l'insertion réussie
      await loadReports();
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* En-tête */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center space-x-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Rezo Ayiti
            </span>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            🇭🇹 Haïti • Sprint 3
          </span>
        </div>
      </header>

      {/* Contenu Principal Mobile-First */}
      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          {/* Section Présentation */}
          <div className="text-center">
            <div className="mb-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              Plateforme Citoyenne Ouverte
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Rezo Ayiti
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base dark:text-slate-400">
              Plateforme collaborative de signalement et de cartographie des
              infrastructures et services publics en Haïti.
            </p>
          </div>

          {/* Grille des Catégories */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xl" role="img" aria-label="Eau">
                💧
              </span>
              <p className="mt-1 font-semibold text-xs sm:text-sm">Eau</p>
              <p className="text-[11px] text-slate-500">Distribution & fuites</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xl" role="img" aria-label="Électricité">
                ⚡
              </span>
              <p className="mt-1 font-semibold text-xs sm:text-sm">Électricité</p>
              <p className="text-[11px] text-slate-500">Réseau & pannes</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xl" role="img" aria-label="Route">
                🛣️
              </span>
              <p className="mt-1 font-semibold text-xs sm:text-sm">Route</p>
              <p className="text-[11px] text-slate-500">État & blocages</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xl" role="img" aria-label="Santé">
                🏥
              </span>
              <p className="mt-1 font-semibold text-xs sm:text-sm">Santé</p>
              <p className="text-[11px] text-slate-500">Centres & soins</p>
            </div>
          </div>

          {/* Section Cartographie Interactive (Leaflet) */}
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg sm:text-xl">
                  Cartographie d&apos;Haïti
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visualisation et navigation interactive des infrastructures publiques.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                <span>🗺️</span>
                <span>OpenStreetMap</span>
              </span>
            </div>

            <MapComponent />
          </section>

          {/* Section Bouton d'action et Messages de retour */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-base">Test du service de signalement</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Envoie un signalement test à Port-au-Prince via{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    reportService.createReport()
                  </code>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendTestReport}
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <svg
                        className="h-3.5 w-3.5 animate-spin text-white"
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
                    "Envoyer un signalement test"
                  )}
                </button>

                <button
                  type="button"
                  onClick={loadReports}
                  disabled={isLoading}
                  title="Rafraîchir les signalements"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
                >
                  🔄 Rafraîchir
                </button>
              </div>
            </div>

            {/* Message de Feedback (Succès vert ou Erreur rouge) */}
            {feedback && (
              <div
                className={`mt-4 rounded-lg p-3 text-xs sm:text-sm ${
                  feedback.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{feedback.type === "success" ? "✅" : "❌"}</span>
                  <p className="font-medium">{feedback.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Section Liste des Derniers Signalements */}
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg sm:text-xl">Derniers signalements</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Signalements publics récupérés via{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    reportService.getReports()
                  </code>
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {reports.length} affiché{reports.length > 1 ? "s" : ""}
              </span>
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

            {/* État : Erreur */}
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

            {/* État : Vide (Message neutre respectant la RLS) */}
            {!isLoading && !fetchError && reports.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-3xl" role="img" aria-label="Information">
                  📋
                </span>
                <p className="mt-2 font-semibold text-sm">
                  Aucun signalement public disponible pour le moment
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                  En vertu des règles de sécurité (RLS), les nouveaux signalements
                  reçoivent le statut initial « en attente » et apparaissent publiquement
                  dès qu&apos;ils sont validés par un modérateur.
                </p>
              </div>
            )}

            {/* État : Liste avec données */}
            {!isLoading && !fetchError && reports.length > 0 && (
              <div className="space-y-3">
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
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 sm:p-5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryInfo.badgeClass}`}
                        >
                          <span>{categoryInfo.icon}</span>
                          <span>{categoryInfo.label}</span>
                        </span>

                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.badgeClass}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <h3 className="mt-2.5 font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {report.title}
                      </h3>

                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                        {report.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800">
                        <span>
                          📍 Lat : {report.latitude.toFixed(4)} • Lng : {report.longitude.toFixed(4)}
                        </span>
                        <span>
                          {new Date(report.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
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
        <p>Rezo Ayiti &copy; 2026 &mdash; Projet open-source sous licence MIT.</p>
      </footer>
    </div>
  );
}
