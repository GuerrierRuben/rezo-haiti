"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentProfile, signIn, signOut } from "@/services/authService";
import {
  getAllReportsForModeration,
  updateReportStatus,
} from "@/services/reportService";
import ModerationList from "@/components/ModerationList";
import type { Profile, Report, ReportStatus } from "@/types";

export default function ModerationPage() {
  // État d'authentification et de profil
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Champs du formulaire de connexion
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // État des données de modération
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Gestion des mises à jour par ligne
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rowFeedback, setRowFeedback] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});

  // 1. Chargement initial du profil au montage (asynchrone, sans setState synchrone)
  useEffect(() => {
    let isMounted = true;

    getCurrentProfile().then(({ data }) => {
      if (!isMounted) return;
      setProfile(data);
      setIsLoadingAuth(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Recharge la liste des signalements pour les modérateurs/administrateurs (déclenché par événement).
   */
  const fetchModerationReports = useCallback(async () => {
    setIsLoadingReports(true);
    setReportsError(null);

    const { data, error } = await getAllReportsForModeration();

    if (error) {
      setReportsError(error);
    } else {
      setReports(data ?? []);
    }

    setIsLoadingReports(false);
  }, []);

  // 2. Chargement initial des signalements si le profil connecté est modérateur ou administrateur
  useEffect(() => {
    if (!profile || (profile.role !== "moderateur" && profile.role !== "admin")) {
      return;
    }

    let isMounted = true;

    getAllReportsForModeration().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setReportsError(error);
      } else {
        setReports(data ?? []);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [profile]);

  /**
   * Soumission du formulaire de connexion Supabase Auth.
   */
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);

    if (!email.trim() || !password) {
      setAuthError("Veuillez renseigner votre adresse courriel et votre mot de passe.");
      return;
    }

    setIsLoggingIn(true);

    const { error } = await signIn(email, password);

    if (error) {
      setAuthError(error);
      setIsLoggingIn(false);
      return;
    }

    // Connexion réussie : récupération du profil associé
    const { data: userProfile, error: profileErr } = await getCurrentProfile();

    if (profileErr || !userProfile) {
      setAuthError("Profil utilisateur introuvable après la connexion.");
      setIsLoggingIn(false);
      return;
    }

    setProfile(userProfile);
    setIsLoggingIn(false);
    setEmail("");
    setPassword("");
  };

  /**
   * Déconnexion de la session.
   */
  const handleLogout = async () => {
    await signOut();
    setProfile(null);
    setReports([]);
    setRowFeedback({});
  };

  /**
   * Met à jour le statut d'un signalement via updateReportStatus.
   */
  const handleStatusChange = async (id: string, newStatus: ReportStatus) => {
    setUpdatingId(id);

    // Efface le feedback précédent de cette ligne
    setRowFeedback((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const { data, error } = await updateReportStatus(id, newStatus);

    if (error) {
      setRowFeedback((prev) => ({
        ...prev,
        [id]: { type: "error", message: error },
      }));
    } else if (data) {
      setRowFeedback((prev) => ({
        ...prev,
        [id]: {
          type: "success",
          message: `Statut mis à jour avec succès : « ${newStatus} ».`,
        },
      }));

      // Rechargement immédiat de la liste pour synchroniser les compteurs et filtres
      await fetchModerationReports();
    }

    setUpdatingId(null);
  };

  // 1. Écran de chargement initial de l'authentification
  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
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
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Vérification des autorisations...
          </p>
        </div>
      </div>
    );
  }

  // 2. Écran non authentifié : Formulaire de connexion
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl dark:bg-blue-950/60">
              🛡️
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Espace Modération
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Réservé aux modérateurs et administrateurs de Rezo Ayiti.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            {authError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
              >
                <div className="flex items-center gap-2">
                  <span>❌</span>
                  <p className="font-medium">{authError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="moderation-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Adresse courriel
                </label>
                <input
                  id="moderation-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoggingIn}
                  placeholder="moderateur@rezoayiti.org"
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="moderation-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Mot de passe
                </label>
                <input
                  id="moderation-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  placeholder="••••••••••••"
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingIn ? (
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
                      Connexion en cours...
                    </span>
                  ) : (
                    "Se connecter à l'espace modérateur"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
              <Link
                href="/"
                className="text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition"
              >
                &larr; Retour à la carte publique
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Écran connecté mais rôle insuffisant (Citoyen normal)
  const isAuthorized =
    profile.role === "moderateur" || profile.role === "admin";

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900/60 dark:bg-slate-900">
          <span className="text-4xl">🚫</span>
          <h1 className="mt-3 text-xl font-bold text-red-900 dark:text-red-300">
            Accès réservé aux modérateurs
          </h1>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Votre compte est connecté avec le rôle <strong>Citoyen</strong>. Vous ne disposez pas des permissions requises pour modérer ou modifier les signalements.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
            >
              Se déconnecter
            </button>
            <Link
              href="/"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 text-center"
            >
              Retourner à l&apos;accueil citoyen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Écran Modérateur / Administrateur : Tableau de bord complet
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Barre supérieure de modération */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              title="Retour à la carte publique"
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              &larr; Carte publique
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Rezo Ayiti Modération
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  profile.role === "admin"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {profile.role === "admin" ? "Administrateur" : "Modérateur"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
              Connecté : <strong>{profile.display_name ?? profile.id.slice(0, 8)}</strong>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal du tableau de bord */}
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Titre et actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Tableau de bord de modération
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Validez ou classez les signalements citoyens pour contrôler leur diffusion sur la carte publique.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchModerationReports}
              disabled={isLoadingReports}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <span>🔄</span>
              <span>Rafraîchir les données</span>
            </button>
          </div>

          {/* Erreur de récupération */}
          {reportsError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              <p className="font-semibold">Erreur de chargement : {reportsError}</p>
            </div>
          )}

          {/* État de chargement */}
          {isLoadingReports ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
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
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Chargement des signalements pour modération...
              </p>
            </div>
          ) : (
            <ModerationList
              reports={reports}
              onStatusChange={handleStatusChange}
              updatingId={updatingId}
              rowFeedback={rowFeedback}
            />
          )}
        </div>
      </main>
    </div>
  );
}
