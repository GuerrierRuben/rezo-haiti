import type { Report, ReportCategory, ReportStatus } from "@/types";

/**
 * Libellés français et styles associés pour les catégories de signalement.
 */
const CATEGORY_LABELS: Record<
  ReportCategory,
  { label: string; icon: string; badgeClass: string }
> = {
  eau: {
    label: "Eau",
    icon: "💧",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900",
  },
  electricite: {
    label: "Électricité",
    icon: "⚡",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  },
  route: {
    label: "Route",
    icon: "🛣️",
    badgeClass:
      "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
  },
  sante: {
    label: "Santé",
    icon: "🏥",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  },
};

/**
 * Libellés français et styles associés pour les statuts de modération.
 */
const STATUS_LABELS: Record<
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

export interface ReportCardProps {
  report: Report;
}

/**
 * Carte de signalement en lecture seule pour l'affichage public.
 * Affiche le titre et la description en nœuds React natifs sans aucun dangerouslySetInnerHTML (anti-XSS).
 */
export default function ReportCard({ report }: ReportCardProps) {
  const categoryInfo = CATEGORY_LABELS[report.category] ?? {
    label: report.category,
    icon: "📍",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const statusInfo = STATUS_LABELS[report.status] ?? {
    label: report.status,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };

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
    <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div>
        {/* En-tête : Badges Catégorie et Statut */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryInfo.badgeClass}`}
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

        {/* Titre (nœud React brut protégé contre toute injection) */}
        <h3 className="mt-2.5 font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
          {report.title}
        </h3>

        {/* Description tronquée à 2 lignes (line-clamp-2) */}
        <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
          {report.description}
        </p>
      </div>

      {/* Pied de carte : Coordonnées GPS et date */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
        <span className="font-mono">
          📍 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
        </span>
        <time dateTime={report.created_at}>{formattedDate}</time>
      </div>
    </article>
  );
}
