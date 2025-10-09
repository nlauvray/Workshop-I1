#!/bin/bash

echo "🚀 Démarrage complet avec serveur PeerJS auto-hébergé"
echo "===================================================="

# Charger les variables d'environnement depuis .env si disponible
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "📋 Variables d'environnement chargées depuis .env"
else
    echo "⚠️  Fichier .env non trouvé, utilisation des valeurs par défaut"
fi

# Générer la configuration PeerJS basée sur les variables d'environnement
echo "🔧 Génération de la configuration PeerJS..."
node generate-peerjs-config.js ${1:-development}

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_peerjs() {
    echo -e "${PURPLE}[PEERJS]${NC} $1"
}

print_debug() {
    echo -e "${CYAN}[DEBUG]${NC} $1"
}

# Vérifier si on est dans le bon répertoire
if [ ! -f "backend/app.py" ]; then
    print_error "Ce script doit être exécuté depuis le répertoire Workshop-I1"
    exit 1
fi

# Nettoyer les processus existants
print_status "Nettoyage des processus existants..."
pkill -f "python backend/app.py" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "peerjs-server" 2>/dev/null || true
sleep 2

# Vérifier les ports
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $1 déjà utilisé, tentative de libération..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

check_port ${BACKEND_PORT:-8000}  # Backend
check_port 3000  # Frontend (port fixe pour React)
check_port ${PEERJS_PORT:-9000}  # PeerJS Server

# Démarrer le serveur PeerJS en premier
print_peerjs "Démarrage du serveur PeerJS auto-hébergé..."
PEERJS_HOST=${PEERJS_HOST:-0.0.0.0}
PEERJS_PORT=${PEERJS_PORT:-9000}
npx peerjs-server --port ${PEERJS_PORT} --host ${PEERJS_HOST} --key peerjs --allow_discovery &
PEERJS_PID=$!

# Attendre que le serveur PeerJS soit prêt
print_peerjs "Attente du démarrage du serveur PeerJS..."
sleep 3

# Vérifier que le serveur PeerJS fonctionne
PEERJS_HOST=${PEERJS_HOST:-localhost}
PEERJS_PORT=${PEERJS_PORT:-9000}
if curl -s http://${PEERJS_HOST}:${PEERJS_PORT} > /dev/null; then
    print_success "Serveur PeerJS démarré avec succès !"
else
    print_error "Échec du démarrage du serveur PeerJS"
    kill $PEERJS_PID 2>/dev/null || true
    exit 1
fi

# Démarrer le backend
print_status "Démarrage du backend FastAPI..."
cd "$(dirname "$0")"

# Activer l'environnement virtuel et installer les dépendances
if [ ! -d "venv" ]; then
    print_status "Création de l'environnement virtuel..."
    python3 -m venv venv
fi

source venv/bin/activate
print_status "Installation des dépendances Python..."
pip install --upgrade pip setuptools wheel > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

# Démarrer le backend en arrière-plan
BACKEND_HOST=${BACKEND_HOST:-0.0.0.0}
BACKEND_PORT=${BACKEND_PORT:-8000}
BACKEND_URL=${BACKEND_URL:-http://localhost:${BACKEND_PORT}}
print_status "Lancement du serveur backend sur ${BACKEND_URL}"
python backend/app.py &
BACKEND_PID=$!

# Attendre que le backend soit prêt
print_status "Attente du démarrage du backend..."
sleep 3

# Vérifier que le backend fonctionne
if curl -s ${BACKEND_URL}/rooms > /dev/null; then
    print_success "Backend démarré avec succès !"
else
    print_error "Échec du démarrage du backend"
    kill $BACKEND_PID 2>/dev/null || true
    kill $PEERJS_PID 2>/dev/null || true
    exit 1
fi

# Démarrer le frontend
print_status "Démarrage du frontend React..."
cd front

# Installer les dépendances npm si nécessaire
if [ ! -d "node_modules" ]; then
    print_status "Installation des dépendances npm..."
    npm install > /dev/null 2>&1
fi

# Démarrer le frontend en mode debug
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
print_debug "Lancement du serveur frontend avec mode debug sur ${FRONTEND_URL}"
REACT_APP_DEBUG_MODE=true npm start &
FRONTEND_PID=$!

# Attendre que le frontend soit prêt
print_status "Attente du démarrage du frontend..."
sleep 5

# Vérifier que le frontend fonctionne
if curl -s ${FRONTEND_URL} > /dev/null; then
    print_success "Frontend démarré avec succès !"
else
    print_warning "Frontend en cours de démarrage..."
fi

echo ""
echo "🎮 ================================================"
echo "🎮   JEU MULTI-JOUEURS AVEC PEERJS LOCAL"
echo "🎮 ================================================"
echo ""
print_success "✅ Serveur PeerJS: http://${PEERJS_HOST}:${PEERJS_PORT}"
print_success "✅ Backend: ${BACKEND_URL}"
print_success "✅ Frontend: ${FRONTEND_URL}"
echo ""
print_peerjs "🎯 Configuration PeerJS:"
echo "   • Host: ${PEERJS_HOST}"
echo "   • Port: ${PEERJS_PORT}"
echo "   • Key: peerjs"
echo "   • Découverte autorisée: OUI"
echo ""
print_status "🎯 Instructions:"
echo "   1. Ouvrez ${FRONTEND_URL} dans votre navigateur"
echo "   2. Ouvrez la console développeur (F12) pour voir les logs PeerJS"
echo "   3. Créez une salle de jeu"
echo "   4. Le chat vocal utilisera le serveur PeerJS local"
echo ""
print_debug "🔍 Pour surveiller les logs:"
echo "   • Console navigateur: F12 > Console"
echo "   • Logs PeerJS: Recherchez '[PEERJS-CHAT]' dans la console"
echo ""
print_status "🛑 Pour arrêter: Ctrl+C"
echo ""

# Fonction de nettoyage
cleanup() {
    echo ""
    print_status "Arrêt de tous les serveurs..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    kill $PEERJS_PID 2>/dev/null || true
    pkill -f "python backend/app.py" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    pkill -f "peerjs-server" 2>/dev/null || true
    print_success "Tous les serveurs arrêtés. Au revoir ! 👋"
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT SIGTERM

# Attendre que l'utilisateur appuie sur Ctrl+C
print_status "Appuyez sur Ctrl+C pour arrêter tous les serveurs"
wait
