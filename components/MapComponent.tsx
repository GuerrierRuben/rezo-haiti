"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Report, ReportCategory, ReportStatus } from "@/types";

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
   * Niveau de zoom initial. Par défaut : 8 (vue globale d'Haïti entière).
   */
  zoom?: number;

  /**
   * Classes Tailwind personnalisées pour le conteneur de la carte.
   */
  className?: string;

  /**
   * Liste des signalements à afficher sous forme de marqueurs interactifs.
   */
  reports?: Report[];

  /**
   * Position géographique actuellement sélectionnée par l'utilisateur via clic.
   */
  selectedPosition?: { lat: number; lng: number } | null;

  /**
   * Callback déclenché lors d'un clic sur la carte pour sélectionner des coordonnées.
   */
  onSelectPosition?: (lat: number, lng: number) => void;
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
 * Libellés français conviviaux pour les catégories de signalement.
 */
const CATEGORY_LABELS: Record<ReportCategory, string> = {
  eau: "Eau",
  electricite: "Électricité",
  route: "Route",
  sante: "Santé",
};

/**
 * Libellés français conviviaux pour les statuts de modération.
 */
const STATUS_LABELS: Record<ReportStatus, string> = {
  en_attente: "En attente",
  valide: "Validé",
  resolu: "Résolu",
};

/**
 * Configuration visuelle des statuts pour les popups (couleurs d'arrière-plan et de texte).
 */
const STATUS_COLORS: Record<ReportStatus, { bg: string; text: string }> = {
  en_attente: { bg: "#fef3c7", text: "#b45309" },
  valide: { bg: "#d1fae5", text: "#047857" },
  resolu: { bg: "#dbeafe", text: "#1d4ed8" },
};

/**
 * Configuration des icônes légères par catégorie (L.divIcon sans dépendance externe).
 */
const CATEGORY_ICONS: Record<
  ReportCategory,
  { emoji: string; borderColor: string }
> = {
  eau: { emoji: "💧", borderColor: "#2563eb" },
  electricite: { emoji: "⚡", borderColor: "#d97706" },
  route: { emoji: "🛣️", borderColor: "#4b5563" },
  sante: { emoji: "🏥", borderColor: "#059669" },
};

/**
 * Crée une icône personnalisée légère avec L.divIcon selon la catégorie du signalement.
 */
function createCategoryDivIcon(category: ReportCategory): L.DivIcon {
  const config = CATEGORY_ICONS[category] ?? {
    emoji: "📍",
    borderColor: "#dc2626",
  };

  return L.divIcon({
    className: "custom-leaflet-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background-color:#ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid ${config.borderColor};font-size:16px;cursor:pointer;">${config.emoji}</div>`,
  });
}

/**
 * Crée l'icône du marqueur temporaire de sélection lors d'un clic sur la carte.
 */
function createSelectionDivIcon(): L.DivIcon {
  return L.divIcon({
    className: "selection-leaflet-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;">
        <span style="position:absolute;width:32px;height:32px;border-radius:9999px;background-color:#ef4444;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background-color:#dc2626;color:#ffffff;font-size:16px;box-shadow:0 3px 8px rgba(0,0,0,0.4);border:2px solid #ffffff;">
          📍
        </div>
      </div>
    `,
  });
}

/**
 * Construit de manière sécurisée le contenu du popup Leaflet via l'API DOM.
 * Évite toute injection de code HTML brut (XSS) en utilisant exclusivement textContent.
 */
function createPopupElement(report: Report): HTMLElement {
  const container = document.createElement("div");
  container.style.maxWidth = "260px";
  container.style.fontFamily = "inherit";
  container.style.fontSize = "12px";
  container.style.lineHeight = "1.4";
  container.style.color = "#1e293b";

  // 1. En-tête : Catégorie & Statut
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "8px";
  header.style.marginBottom = "8px";

  const categoryBadge = document.createElement("span");
  categoryBadge.style.fontSize = "11px";
  categoryBadge.style.fontWeight = "600";
  categoryBadge.style.padding = "2px 8px";
  categoryBadge.style.borderRadius = "9999px";
  categoryBadge.style.backgroundColor = "#f1f5f9";
  categoryBadge.style.color = "#334155";
  categoryBadge.textContent = CATEGORY_LABELS[report.category] ?? report.category;

  const statusBadge = document.createElement("span");
  statusBadge.style.fontSize = "10px";
  statusBadge.style.fontWeight = "600";
  statusBadge.style.padding = "2px 8px";
  statusBadge.style.borderRadius = "9999px";
  const statusColor = STATUS_COLORS[report.status] ?? {
    bg: "#f1f5f9",
    text: "#475569",
  };
  statusBadge.style.backgroundColor = statusColor.bg;
  statusBadge.style.color = statusColor.text;
  statusBadge.textContent = STATUS_LABELS[report.status] ?? report.status;

  header.appendChild(categoryBadge);
  header.appendChild(statusBadge);
  container.appendChild(header);

  // 2. Titre en gras (sécurisé via textContent)
  const title = document.createElement("h4");
  title.style.margin = "0 0 6px 0";
  title.style.fontSize = "13px";
  title.style.fontWeight = "700";
  title.style.color = "#0f172a";
  title.style.lineHeight = "1.3";
  title.textContent = report.title;
  container.appendChild(title);

  // 3. Description tronquée à 150 caractères (sécurisée via textContent)
  const description = document.createElement("p");
  description.style.margin = "0 0 8px 0";
  description.style.fontSize = "12px";
  description.style.color = "#475569";
  const rawDesc = report.description ?? "";
  description.textContent =
    rawDesc.length > 150 ? `${rawDesc.slice(0, 150).trim()}…` : rawDesc;
  container.appendChild(description);

  // 4. Pied de popup : Date formatée en fr-FR
  const footer = document.createElement("div");
  footer.style.fontSize = "10px";
  footer.style.color = "#94a3b8";
  footer.style.borderTop = "1px solid #e2e8f0";
  footer.style.paddingTop = "6px";
  const formattedDate = new Date(report.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  footer.textContent = `Signalé le ${formattedDate}`;
  container.appendChild(footer);

  return container;
}

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
 * Affiche dynamiquement les signalements et permet de sélectionner des coordonnées au clic.
 */
export default function MapComponent({
  center = [18.9712, -72.2852],
  zoom = 8,
  className = "h-[60vh] min-h-[320px] w-full rounded-xl border border-slate-200 shadow-xs overflow-hidden dark:border-slate-800",
  reports = [],
  selectedPosition = null,
  onSelectPosition,
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const selectionMarkerRef = useRef<L.Marker | null>(null);

  // Référence mutable pour éviter des fermetures obsolètes dans l'écouteur d'événements Leaflet
  const onSelectPositionRef = useRef(onSelectPosition);
  useEffect(() => {
    onSelectPositionRef.current = onSelectPosition;
  }, [onSelectPosition]);

  // 1. Initialisation unique de la carte (aucun reset lors d'un changement de reports ou selectedPosition)
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

    // Groupe de calques dédié aux marqueurs pour mises à jour dynamiques sans fuite
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    // Écouteur d'événement de clic pour la sélection de coordonnées
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (onSelectPositionRef.current) {
        onSelectPositionRef.current(lat, lng);
      }
    });

    // Invalidation de la taille pour s'assurer que les tuiles se chargent dès l'affichage
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Nettoyage au démontage
    return () => {
      clearTimeout(timer);
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.remove();
        selectionMarkerRef.current = null;
      }
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        markersLayerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Gestion dynamique des marqueurs de signalements (ne modifie jamais le zoom ni le centre de la carte)
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    // Vide les anciens marqueurs pour éviter les doublons et fuites mémoires
    markersLayer.clearLayers();

    // Ajoute un marqueur pour chaque signalement valide
    reports.forEach((report) => {
      const lat = Number(report.latitude);
      const lng = Number(report.longitude);

      // Ignore les signalements dont les coordonnées sont invalides
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        Number.isNaN(lat) ||
        Number.isNaN(lng)
      ) {
        return;
      }

      // Création de l'icône personnalisée par catégorie
      const customIcon = createCategoryDivIcon(report.category);

      // Création du marqueur Leaflet
      const marker = L.marker([lat, lng], { icon: customIcon });

      // Construction sécurisée du popup HTML (anti-XSS)
      const popupContent = createPopupElement(report);
      marker.bindPopup(popupContent, {
        closeButton: true,
        className: "custom-leaflet-popup",
      });

      // Ajout au layerGroup dédié
      markersLayer.addLayer(marker);
    });
  }, [reports]);

  // 3. Gestion du marqueur temporaire de sélection (créé/déplacé quand selectedPosition change, supprimé si null)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedPosition) {
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.remove();
        selectionMarkerRef.current = null;
      }
      return;
    }

    const { lat, lng } = selectedPosition;
    const selectionIcon = createSelectionDivIcon();

    if (selectionMarkerRef.current) {
      selectionMarkerRef.current.setLatLng([lat, lng]);
      selectionMarkerRef.current.setIcon(selectionIcon);
    } else {
      const marker = L.marker([lat, lng], {
        icon: selectionIcon,
        zIndexOffset: 1000,
      });
      marker.bindTooltip("Emplacement sélectionné", {
        permanent: false,
        direction: "top",
      });
      marker.addTo(map);
      selectionMarkerRef.current = marker;
    }
  }, [selectedPosition]);

  return (
    <div
      ref={containerRef}
      className={`${className} cursor-crosshair [&_.leaflet-grab]:cursor-crosshair [&_.leaflet-container]:cursor-crosshair`}
    />
  );
}

export { MapComponent };
