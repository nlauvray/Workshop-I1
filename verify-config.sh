#!/bin/bash

# Script de vérification de la configuration
# Vérifie que tous les localhost ont été remplacés par des variables d'environnement

echo "🔍 Vérification de la configuration..."
echo "====================================="

ERRORS=0

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo ""
echo "📋 Variables d'environnement chargées:"
echo "   BACKEND_URL: ${BACKEND_URL:-non défini}"
echo "   FRONTEND_URL: ${FRONTEND_URL:-non défini}"
echo "   REACT_APP_BACKEND_URL: ${REACT_APP_BACKEND_URL:-non défini}"
echo "   REACT_APP_PEERJS_HOST: ${REACT_APP_PEERJS_HOST:-non défini}"

echo ""
echo "🔍 Vérification des fichiers..."

# Vérifier le backend
echo "   Backend (app.py):"
if grep -q "localhost" backend/app.py | grep -v "getenv.*localhost"; then
    echo "   ❌ localhost trouvé dans backend/app.py (en dehors des valeurs par défaut)"
    ERRORS=$((ERRORS + 1))
else
    echo "   ✅ Pas de localhost hardcodé (valeurs par défaut OK)"
fi

# Vérifier les composants React
echo "   Composants React:"
REACT_ERRORS=0
for file in front/src/components/*.js; do
    if [ -f "$file" ]; then
        # Ignorer les valeurs par défaut dans process.env.REACT_APP_* || 'localhost'
        if grep -q "localhost" "$file" | grep -v "process.env.*||.*localhost"; then
            echo "   ❌ localhost trouvé dans $(basename $file) (en dehors des valeurs par défaut)"
            REACT_ERRORS=$((REACT_ERRORS + 1))
        fi
    fi
done

if [ $REACT_ERRORS -eq 0 ]; then
    echo "   ✅ Aucun localhost hardcodé trouvé (valeurs par défaut OK)"
else
    ERRORS=$((ERRORS + REACT_ERRORS))
fi

# Vérifier la configuration PeerJS
echo "   Configuration PeerJS:"
if [ -f peerjs-config.json ]; then
    echo "   ✅ peerjs-config.json généré"
else
    echo "   ❌ peerjs-config.json manquant"
    ERRORS=$((ERRORS + 1))
fi

# Vérifier le fichier .env
echo "   Fichier .env:"
if [ -f .env ]; then
    echo "   ✅ Fichier .env présent"
else
    echo "   ❌ Fichier .env manquant"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "🧪 Test de connectivité..."

# Test du backend (si en cours d'exécution)
if curl -s ${BACKEND_URL:-http://localhost:8000}/rooms > /dev/null 2>&1; then
    echo "   ✅ Backend accessible"
else
    echo "   ⚠️  Backend non accessible (normal si pas démarré)"
fi

# Test de PeerJS (si en cours d'exécution)
if curl -s http://${REACT_APP_PEERJS_HOST:-localhost}:${REACT_APP_PEERJS_PORT:-9000} > /dev/null 2>&1; then
    echo "   ✅ PeerJS accessible"
else
    echo "   ⚠️  PeerJS non accessible (normal si pas démarré)"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ Configuration OK ! Prêt pour le déploiement."
    echo ""
    echo "🚀 Pour démarrer l'application:"
    echo "   ./start_all.sh"
    echo ""
    echo "🏭 Pour la production:"
    echo "   1. Modifiez .env avec vos URLs de production"
    echo "   2. ./setup-env.sh production"
    echo "   3. ./start_all.sh"
else
    echo "❌ $ERRORS erreur(s) trouvée(s). Vérifiez la configuration."
    exit 1
fi
