/**
 * Rôles d'utilisateurs disponibles sur Rezo Ayiti.
 */
export type UserRole = "citoyen" | "moderateur" | "admin";

/**
 * Interface représentant un profil utilisateur stocké dans la table profiles.
 */
export interface Profile {
  id: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
}

/**
 * Données modifiables par l'utilisateur connecté sur son propre profil.
 */
export type UpdateProfileInput = {
  display_name: string;
};
