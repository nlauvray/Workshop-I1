#!/bin/bash

# Script pour configurer l'environnement de développement
# Usage: ./setup-env.sh [environment]
# environment peut être: development, production

ENVIRONMENT=${1:-development}

echo "🔧 Configuration de l'environnement: $ENVIRONMENT"
echo "================================================"

# Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env..."
    if [ "$ENVIRONMENT" = "production" ]; then
        cp env.production .env
        echo "✅ Fichier .env créé à partir de env.production"
    else
        cp env.example .env
        echo "✅ Fichier .env créé à partir de env.example"
    fi
    echo ""
    echo "⚠️  IMPORTANT: Modifiez le fichier .env avec vos vraies valeurs avant de démarrer l'application"
    echo ""
else
    echo "ℹ️  Le fichier .env existe déjà"
fi

# Générer la configuration PeerJS
echo "🔧 Génération de la configuration PeerJS..."
node generate-peerjs-config.js $ENVIRONMENT

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Modifiez le fichier .env si nécessaire"
echo "   2. Lancez l'application avec ./start_all.sh"
echo ""
echo "🌐 URLs par défaut:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend:  http://localhost:8000"
echo "   • PeerJS:   http://localhost:9000"
