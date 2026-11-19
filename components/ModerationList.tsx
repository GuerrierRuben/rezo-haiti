"use client";

import { useMemo, useState } from "react";
import type { Report, ReportCategory, ReportStatus } from "@/types";

export interface ModerationListProps {
  reports: Report[];
  onStatusChange: (id: string, newStatus: ReportStatus) => Promise<void>;
  updatingId: string | null;
  rowFeedback: Record<string, { type: "success" | "error"; message: string }>;
}

const CATEGORY_NAMES: Record<ReportCategory, string> = {
  eau: "💧 Eau",
  electricite: "⚡ Électricité",
  route: "🛣️ Route",
  sante: "🏥 Santé",
};

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; badgeClass: string }
> = {
  en_attente: {
    label: "En attente",
    badgeClass:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  valide: {
    label: "Validé",
    badgeClass:
      "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  resolu: {
    label: "Résolu",
    badgeClass:
      "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  },
};

/**
 * Composant de gestion et de modération des signalements.
 * Affiche les compteurs par statut, les filtres interactifs et la liste avec sélecteur de statut.
 */
export default function ModerationList({
  reports,
  onStatusChange,
  updatingId,
  rowFeedback,
}: ModerationListProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Calcul des compteurs par statut
  const counts = useMemo(() => {
    const total = reports.length;
    let pending = 0;
    let validated = 0;
    let resolved = 0;

    for (const r of reports) {
      if (r.status === "en_attente") pending++;
      else if (r.status === "valide") validated++;
      else if (r.status === "resolu") resolved++;
    }

    return { total, pending, validated, resolved };
  }, [reports]);

  // Filtrage combiné (statut, catégorie, recherche)
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (selectedStatus !== "all" && report.status !== selectedStatus) {
        return false;
      }
      if (selectedCategory !== "all" && report.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchTitle = report.title.toLowerCase().includes(query);
        const matchDesc = report.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [reports, selectedStatus, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Compteurs statistiques par statut */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total signalements
          </p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
            {counts.total}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            ⏳ En attente
          </p>
          <p className="mt-1 text-2xl font-extrabold text-amber-800 dark:text-amber-300">
            {counts.pending}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            ✅ Validés
          </p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-800 dark:text-emerald-300">
            {counts.validated}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            🎉 Résolus
          </p>
          <p className="mt-1 text-2xl font-extrabold text-blue-800 dark:text-blue-300">
            {counts.resolved}
          </p>
        </div>
      </div>

      {/* 2. Barre d'outils et Filtres */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Recherche textuelle */}
          <div className="relative flex-1">
            <label htmlFor="search-moderation" className="sr-only">
              Rechercher un signalement
            </label>
            <input
              id="search-moderation"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre ou mot-clé..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-2xs placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Filtre par statut */}
          <div>
            <label htmlFor="filter-status" className="sr-only">
              Filtrer par statut
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto"
            >
              <option value="all">Tous les statuts ({counts.total})</option>
              <option value="en_attente">En attente ({counts.pending})</option>
              <option value="valide">Validés ({counts.validated})</option>
              <option value="resolu">Résolus ({counts.resolved})</option>
            </select>
          </div>

          {/* Filtre par catégorie */}
          <div>
            <label htmlFor="filter-category" className="sr-only">
              Filtrer par catégorie
            </label>
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto"
            >
              <option value="all">Toutes les catégories</option>
              <option value="eau">💧 Eau</option>
              <option value="electricite">⚡ Électricité</option>
              <option value="route">🛣️ Route</option>
              <option value="sante">🏥 Santé</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          {filteredReports.length} affiché{filteredReports.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* 3. Liste des signalements */}
      {filteredReports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-2xl">📋</p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
            Aucun signalement ne correspond à ces critères
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Modifiez vos filtres ou la recherche pour afficher d&apos;autres résultats.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isRowUpdating = updatingId === report.id;
            const feedback = rowFeedback[report.id];
            const statusConfig = STATUS_CONFIG[report.status];

            const formattedDate = new Date(report.created_at).toLocaleDateString(
              "fr-FR",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            );

            return (
              <article
                key={report.id}
                className={`rounded-xl border bg-white p-4 shadow-xs transition dark:bg-slate-900 ${
                  isRowUpdating
                    ? "border-blue-300 bg-blue-50/20 dark:border-blue-800"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Informations du signalement */}
                  <div className="space-y-1 sm:max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {CATEGORY_NAMES[report.category] ?? report.category}
                      </span>

                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusConfig.badgeClass}`}
                      >
                        {statusConfig.label}
                      </span>

                      <span className="text-[11px] text-slate-400">
                        {formattedDate}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {report.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {report.description}
                    </p>

                    <div className="pt-1 text-[11px] text-slate-400">
                      <span className="font-mono">
                        📍 Lat : {report.latitude.toFixed(5)} • Lng :{" "}
                        {report.longitude.toFixed(5)}
                      </span>
                      <span className="ml-3 font-mono text-[10px] text-slate-400">
                        ID : {report.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Contrôle de modération (Sélecteur de statut) */}
                  <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0">
                    <label
                      htmlFor={`status-select-${report.id}`}
                      className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                    >
                      Modifier le statut :
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        id={`status-select-${report.id}`}
                        value={report.status}
                        disabled={isRowUpdating}
                        onChange={(e) =>
                          onStatusChange(report.id, e.target.value as ReportStatus)
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-white ${
                          report.status === "valide"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : report.status === "resolu"
                            ? "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        <option value="en_attente">⏳ En attente</option>
                        <option value="valide">✅ Valider (rendre public)</option>
                        <option value="resolu">🎉 Marquer comme résolu</option>
                      </select>

                      {isRowUpdating && (
                        <svg
                          className="h-4 w-4 animate-spin text-blue-600"
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
                      )}
                    </div>
                  </div>
                </div>

                {/* Retour inline de la mise à jour (succès vert ou erreur rouge) */}
                {feedback && (
                  <div
                    className={`mt-2.5 rounded-lg p-2 text-xs font-medium ${
                      feedback.type === "success"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    <span>{feedback.type === "success" ? "✅ " : "❌ "}</span>
                    <span>{feedback.message}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
