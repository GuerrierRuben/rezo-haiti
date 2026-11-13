"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Propriétés du composant cartographique réutilisable.
 */
export interface MapComponentProps {
  /**
   * Coordonnées [latitude, longitude] du centre initial de la carte.
   * Par défaut : [18.9712, -72.2852] (centre géographique d'Haïti).
   */
  center?: [number, number];

  /**
   * Niveau de zoom initial. Par défaut : 8.
   */
  zoom?: number;

  /**
   * Classes Tailwind personnalisées pour le conteneur de la carte.
   */
  className?: string;
}

/**
 * Bounding box d'Haïti pour contraindre le déplacement de l'utilisateur.
 * Sud-ouest : [17.5, -75.2] | Nord-est : [20.5, -71.0]
 */
const HAITI_BOUNDS: L.LatLngBoundsExpression = [
  [17.5, -75.2],
  [20.5, -71.0],
];

/**
 * Correction du chargement des icônes de marqueurs par défaut sous bundler (Turbopack / Webpack).
 */
function fixLeafletDefaultIcons(): void {
  delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

/**
 * Composant cartographique interactif basé sur Leaflet et OpenStreetMap.
 * Conçu pour un rendu exclusivement côté client (no-SSR).
 */
export default function MapComponent({
  center = [18.9712, -72.2852],
  zoom = 8,
  className = "h-[60vh] min-h-[320px] w-full rounded-xl border border-slate-200 shadow-xs overflow-hidden dark:border-slate-800",
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Protection contre le double montage de React Strict Mode
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Configuration des icônes par défaut
    fixLeafletDefaultIcons();

    // Initialisation de la carte Leaflet
    const map = L.map(containerRef.current, {
      center,
      zoom,
      minZoom: 7,
      maxBounds: HAITI_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: true,
    });

    // Ajout du fond de carte OpenStreetMap avec attribution obligatoire
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Invalidation de la taille pour s'assurer que les tuiles se chargent dès l'affichage
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Nettoyage au démontage
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom]);

  return <div ref={containerRef} className={className} />;
}

export { MapComponent };
