#!/bin/bash

echo "🐛 Démarrage du jeu en MODE DEBUG - Drone Detection"
echo "=================================================="

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

print_debug() {
    echo -e "${PURPLE}[DEBUG]${NC} $1"
}

print_aeroport() {
    echo -e "${CYAN}[AEROPORT]${NC} $1"
}

# Vérifier si on est dans le bon répertoire
if [ ! -f "backend/app.py" ]; then
    print_error "Ce script doit être exécuté depuis le répertoire Workshop-I1"
    exit 1
fi

# Charger les variables d'environnement debug
if [ -f "env.debug" ]; then
    print_debug "Chargement des variables d'environnement debug..."
    export $(cat env.debug | grep -v '^#' | xargs)
    print_success "Variables debug chargées"
else
    print_warning "Fichier env.debug non trouvé, utilisation des valeurs par défaut"
    export DEBUG_MODE=true
    export LOG_LEVEL=DEBUG
    export ENABLE_AEROPORT_LOGS=true
    export ENABLE_GAME_EMBED_LOGS=true
fi

# Créer le dossier de logs s'il n'existe pas
mkdir -p logs
print_debug "Dossier de logs créé/vérifié"

# Nettoyer les processus existants
print_status "Nettoyage des processus existants..."
pkill -f "python backend/app.py" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
sleep 2

# Vérifier les ports
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $1 déjà utilisé, tentative de libération..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

check_port 8000
check_port 3000

# Démarrer le backend
print_status "Démarrage du backend FastAPI en mode DEBUG..."
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

# Démarrer le backend en mode debug avec logs détaillés
print_debug "Lancement du serveur backend avec logs debug sur http://localhost:8000"
print_aeroport "Activation des logs AeroportGame et Game Embed"
python backend/app.py > logs/backend_debug.log 2>&1 &
BACKEND_PID=$!

# Attendre que le backend soit prêt
print_status "Attente du démarrage du backend..."
sleep 3

# Vérifier que le backend fonctionne
if curl -s http://localhost:8000/rooms > /dev/null; then
    print_success "Backend démarré avec succès en mode DEBUG !"
    print_debug "Logs backend disponibles dans: logs/backend_debug.log"
else
    print_error "Échec du démarrage du backend"
    print_debug "Vérifiez les logs dans: logs/backend_debug.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Démarrer le frontend
print_status "Démarrage du frontend React en mode DEBUG..."
cd front

# Installer les dépendances npm si nécessaire
if [ ! -d "node_modules" ]; then
    print_status "Installation des dépendances npm..."
    npm install > /dev/null 2>&1
fi

# Démarrer le frontend en mode debug
print_debug "Lancement du serveur frontend avec logs debug sur http://localhost:3000"
print_aeroport "Activation des logs AeroportGame et Game Embed dans le navigateur"
REACT_APP_DEBUG_MODE=true REACT_APP_LOG_LEVEL=debug REACT_APP_ENABLE_CONSOLE_LOGS=true npm start > ../logs/frontend_debug.log 2>&1 &
FRONTEND_PID=$!

# Attendre que le frontend soit prêt
print_status "Attente du démarrage du frontend..."
sleep 5

# Vérifier que le frontend fonctionne
if curl -s http://localhost:3000 > /dev/null; then
    print_success "Frontend démarré avec succès en mode DEBUG !"
    print_debug "Logs frontend disponibles dans: logs/frontend_debug.log"
else
    print_warning "Frontend en cours de démarrage..."
fi

echo ""
echo "🐛 ================================================"
echo "🐛   JEU EN MODE DEBUG - DRONE DETECTION"
echo "🐛 ================================================"
echo ""
print_success "✅ Backend DEBUG: http://localhost:8000"
print_success "✅ Frontend DEBUG: http://localhost:3000"
print_debug "📋 Logs Backend: logs/backend_debug.log"
print_debug "📋 Logs Frontend: logs/frontend_debug.log"
echo ""
print_aeroport "🎯 Fonctionnalités DEBUG activées:"
echo "   • Logs détaillés AeroportGame"
echo "   • Logs Game Embed (iframe)"
echo "   • Logs WebSocket en temps réel"
echo "   • Logs de détection de drone"
echo "   • Logs de traitement d'images"
echo "   • Console logs dans le navigateur"
echo ""
print_status "🎯 Instructions:"
echo "   1. Ouvrez http://localhost:3000 dans votre navigateur"
echo "   2. Ouvrez la console développeur (F12)"
echo "   3. Créez une salle de jeu"
echo "   4. Observez les logs détaillés dans la console"
echo "   5. Vérifiez les logs fichiers dans le dossier logs/"
echo ""
print_debug "🔍 Pour surveiller les logs en temps réel:"
echo "   tail -f logs/backend_debug.log"
echo "   tail -f logs/frontend_debug.log"
echo ""
print_status "🛑 Pour arrêter: Ctrl+C ou fermez ce terminal"
echo ""

# Fonction de nettoyage
cleanup() {
    echo ""
    print_status "Arrêt des serveurs DEBUG..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "python backend/app.py" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    print_success "Serveurs DEBUG arrêtés. Au revoir ! 👋"
    print_debug "Logs conservés dans le dossier logs/"
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT SIGTERM

# Attendre que l'utilisateur appuie sur Ctrl+C
print_status "Appuyez sur Ctrl+C pour arrêter les serveurs DEBUG"
wait
