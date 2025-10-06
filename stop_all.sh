#!/bin/bash

echo "🛑 Arrêt du jeu multi-joueurs Drone Detection"
echo "=============================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Arrêter tous les processus liés au jeu
print_status "Arrêt des processus backend..."
pkill -f "python backend/app.py" 2>/dev/null || true

print_status "Arrêt des processus frontend..."
pkill -f "react-scripts start" 2>/dev/null || true

print_status "Arrêt des processus uvicorn..."
pkill -f "uvicorn" 2>/dev/null || true

print_status "Arrêt des processus node..."
pkill -f "node.*start" 2>/dev/null || true

# Libérer les ports
print_status "Libération des ports 8000 et 3000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

sleep 2

# Vérifier que les ports sont libres
if ! lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null && ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
    print_success "✅ Tous les serveurs ont été arrêtés avec succès !"
    print_success "✅ Ports 8000 et 3000 libérés"
else
    print_warning "⚠️  Certains processus pourraient encore être actifs"
    print_status "Processus restants sur le port 8000:"
    lsof -Pi :8000 2>/dev/null || echo "Aucun"
    print_status "Processus restants sur le port 3000:"
    lsof -Pi :3000 2>/dev/null || echo "Aucun"
fi

echo ""
print_success "🎮 Jeu arrêté. Au revoir ! 👋"
