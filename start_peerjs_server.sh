#!/bin/bash

echo "🚀 Démarrage du serveur PeerJS auto-hébergé"
echo "=========================================="

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
if [ ! -f "package.json" ]; then
    print_error "Ce script doit être exécuté depuis le répertoire Workshop-I1"
    exit 1
fi

# Nettoyer les processus existants
print_status "Nettoyage des processus PeerJS existants..."
pkill -f "peerjs-server" 2>/dev/null || true
sleep 2

# Vérifier le port 9000
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $1 déjà utilisé, tentative de libération..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

check_port 9000

# Démarrer le serveur PeerJS
print_status "Démarrage du serveur PeerJS sur le port 9000..."

# Créer un fichier de configuration pour le serveur PeerJS
cat > peerjs-config.json << EOF
{
  "port": 9000,
  "path": "/",
  "host": "0.0.0.0",
  "key": "peerjs",
  "allow_discovery": true,
  "proxied": false,
  "cors": {
    "origin": ["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000", "http://127.0.0.1:8000"]
  },
  "cleanup_out_msgs": 1000,
  "ssl": {
    "key": "",
    "cert": ""
  }
}
EOF

print_success "Configuration PeerJS créée: peerjs-config.json"

# Démarrer le serveur PeerJS en arrière-plan
npx peerjs-server --port 9000 --host 0.0.0.0 --key peerjs --allow_discovery &
PEERJS_PID=$!

# Attendre que le serveur soit prêt
print_status "Attente du démarrage du serveur PeerJS..."
sleep 3

# Vérifier que le serveur fonctionne
if curl -s http://localhost:9000 > /dev/null; then
    print_success "Serveur PeerJS démarré avec succès !"
else
    print_error "Échec du démarrage du serveur PeerJS"
    kill $PEERJS_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🔗 ================================================"
echo "🔗   SERVEUR PEERJS AUTO-HÉBERGÉ"
echo "🔗 ================================================"
echo ""
print_success "✅ Serveur PeerJS: http://localhost:9000"
print_success "✅ Clé de serveur: peerjs"
echo ""
print_status "🎯 Configuration pour votre application:"
echo "   • Host: localhost"
echo "   • Port: 9000"
echo "   • Path: /"
echo "   • Key: peerjs"
echo ""
print_status "🔧 Pour utiliser ce serveur dans votre code:"
echo "   const peer = new Peer(id, {"
echo "     host: 'localhost',"
echo "     port: 9000,"
echo "     path: '/',"
echo "     key: 'peerjs'"
echo "   });"
echo ""
print_status "🛑 Pour arrêter: Ctrl+C"
echo ""

# Fonction de nettoyage
cleanup() {
    echo ""
    print_status "Arrêt du serveur PeerJS..."
    kill $PEERJS_PID 2>/dev/null || true
    pkill -f "peerjs-server" 2>/dev/null || true
    print_success "Serveur PeerJS arrêté. Au revoir ! 👋"
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT SIGTERM

# Attendre que l'utilisateur appuie sur Ctrl+C
print_status "Appuyez sur Ctrl+C pour arrêter le serveur PeerJS"
wait
