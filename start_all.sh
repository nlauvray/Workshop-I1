#!/bin/bash

echo "🚀 Démarrage du jeu multi-joueurs Drone Detection"
echo "=================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Vérifier si on est dans le bon répertoire
if [ ! -f "backend/app.py" ]; then
    print_error "Ce script doit être exécuté depuis le répertoire Workshop-I1"
    exit 1
fi

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
print_status "Démarrage du backend FastAPI..."
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    print_status "Création de l'environnement virtuel..."
    python -m venv venv
fi

# Détection auto Windows / Linux
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

print_status "Installation des dépendances Python..."
pip install --upgrade pip setuptools wheel > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

# Démarrer le backend en arrière-plan
print_status "Lancement du serveur backend sur http://localhost:8000"
python backend/app.py &
BACKEND_PID=$!

# Attendre que le backend soit prêt
print_status "Attente du démarrage du backend..."
sleep 3

# Vérifier que le backend fonctionne
if curl -s http://localhost:8000/rooms > /dev/null; then
    print_success "Backend démarré avec succès !"
else
    print_error "Échec du démarrage du backend"
    kill $BACKEND_PID 2>/dev/null || true
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

# Démarrer le frontend en arrière-plan
print_status "Lancement du serveur frontend sur http://localhost:3000"
npm start &
FRONTEND_PID=$!

# Attendre que le frontend soit prêt
print_status "Attente du démarrage du frontend..."
sleep 5

# Vérifier que le frontend fonctionne
if curl -s http://localhost:3000 > /dev/null; then
    print_success "Frontend démarré avec succès !"
else
    print_warning "Frontend en cours de démarrage..."
fi

echo ""
echo "🎮 ================================================"
echo "🎮   JEU MULTI-JOUEURS DRONE DETECTION"
echo "🎮 ================================================"
echo ""
print_success "✅ Backend: http://localhost:8000"
print_success "✅ Frontend: http://localhost:3000"
echo ""
print_status "🎯 Instructions:"
echo "   1. Ouvrez http://localhost:3000 dans votre navigateur"
echo "   2. Créez une salle de jeu"
echo "   3. Partagez l'ID de la salle avec un autre joueur"
echo "   4. Jouez ensemble !"
echo ""
print_status "🛑 Pour arrêter: Ctrl+C ou fermez ce terminal"
echo ""

# Fonction de nettoyage
cleanup() {
    echo ""
    print_status "Arrêt des serveurs..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "python backend/app.py" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    print_success "Serveurs arrêtés. Au revoir ! 👋"
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT SIGTERM

# Attendre que l'utilisateur appuie sur Ctrl+C
print_status "Appuyez sur Ctrl+C pour arrêter les serveurs"
wait
