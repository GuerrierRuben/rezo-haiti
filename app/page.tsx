export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* En-tête */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center space-x-2">
            <span className="inline-flex h-3 w-3 rounded-full bg-red-600 animate-pulse" />
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Rezo Ayiti
            </span>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            🇭🇹 Haïti • Sprint 1
          </span>
        </div>
      </header>

      {/* Contenu Principal Mobile-First */}
      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          {/* Badge de statut */}
          <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            Plateforme Citoyenne Ouverte
          </div>

          {/* Titre principal */}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Rezo Ayiti
          </h1>

          {/* Sous-titre court en français */}
          <p className="mt-4 text-base text-slate-600 sm:text-lg dark:text-slate-400">
            Plateforme collaborative de signalement et de cartographie des
            infrastructures et services publics en Haïti.
          </p>

          {/* Catégories de signalements */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-2xl" role="img" aria-label="Eau">
                💧
              </span>
              <p className="mt-2 font-semibold text-sm text-slate-900 dark:text-white">
                Eau
              </p>
              <p className="text-xs text-slate-500">Distribution & coupures</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-2xl" role="img" aria-label="Électricité">
                ⚡
              </span>
              <p className="mt-2 font-semibold text-sm text-slate-900 dark:text-white">
                Électricité
              </p>
              <p className="text-xs text-slate-500">Réseau & pannes</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-2xl" role="img" aria-label="Route">
                🛣️
              </span>
              <p className="mt-2 font-semibold text-sm text-slate-900 dark:text-white">
                Route
              </p>
              <p className="text-xs text-slate-500">État & blocages</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-2xl" role="img" aria-label="Santé">
                🏥
              </span>
              <p className="mt-2 font-semibold text-sm text-slate-900 dark:text-white">
                Santé
              </p>
              <p className="text-xs text-slate-500">Centres & urgences</p>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 sm:w-auto"
            >
              Signaler un problème
            </button>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
            >
              Explorer la cartographie
            </button>
          </div>
        </div>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p>
          Rezo Ayiti &copy; 2026 &mdash; Projet open-source sous licence MIT.
        </p>
      </footer>
    </div>
  );
}
