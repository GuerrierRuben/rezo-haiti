#!/usr/bin/env bash
# ==============================================================================
# Script de test automatisé des endpoints Rezo Ayiti
# Usage : ./scripts/test-api.sh [BASE_URL]
# ==============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3000/api}"

echo "================================================="
echo "🧪 Tests de l'API Rezo Ayiti ($BASE_URL)"
echo "================================================="

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

assert_status() {
    local name="$1"
    local expected="$2"
    local actual="$3"
    if [ "$actual" -eq "$expected" ]; then
        echo -e "  ✅ $name (HTTP $actual)"
    else
        echo -e "  ❌ $name (Attendu $expected, reçu $actual)"
    fi
}

echo ""
echo "1. Test GET /api/reports (Public)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/reports")
assert_status "Liste des signalements" 200 "$STATUS"

echo ""
echo "2. Test POST /api/reports avec coordonnées hors Haïti (Validation 422 attendue)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/reports" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Paris","description":"Hors Haïti","category":"route","latitude":48.85,"longitude":2.35}')
assert_status "Rejet coordonnées hors Haïti" 422 "$STATUS"

echo ""
echo "3. Test POST /api/reports valide (Création 201 attendue)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/reports" \
  -H "Content-Type: application/json" \
  -d '{"title":"Route inondée Carrefour","description":"Route impraticable suite aux fortes pluies récentes.","category":"route","latitude":18.5392,"longitude":-72.3350}')
STATUS=$(echo "$RESPONSE" | tail -n1)
assert_status "Création signalement conforme" 201 "$STATUS"

echo ""
echo "4. Test GET /api/reports/nearby (Recherche spatiale PostGIS)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/reports/nearby?lat=18.5392&lng=-72.3350&radius=10000")
assert_status "Recherche géographique nearby" 200 "$STATUS"

echo ""
echo "5. Test GET /api/users/me sans authentification (401 attendu)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/users/me")
assert_status "Profil protégé non authentifié" 401 "$STATUS"

echo ""
echo "6. Test GET /api/users sans token admin (401 attendu)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/users")
assert_status "Liste utilisateurs protégée" 401 "$STATUS"

echo ""
echo "================================================="
echo "🎉 Tests de base terminés !"
echo "================================================="
