# 🔧 Configuration des Variables d'Environnement

Ce document explique comment configurer le projet pour différents environnements (développement et production).

## 📁 Fichiers de Configuration

- **`env.example`** - Template pour l'environnement de développement
- **`env.production`** - Template pour l'environnement de production
- **`.env`** - Fichier de configuration actuel (créé automatiquement)
- **`generate-peerjs-config.js`** - Script pour générer la configuration PeerJS dynamiquement

## 🚀 Démarrage Rapide

### 1. Configuration Initiale

```bash
# Pour l'environnement de développement
./setup-env.sh development

# Pour l'environnement de production
./setup-env.sh production
```

### 2. Personnalisation

Modifiez le fichier `.env` avec vos valeurs :

```bash
nano .env
```

### 3. Démarrage de l'Application

```bash
./start_all.sh
```

## 🌐 Variables d'Environnement

### Backend

| Variable | Défaut | Description |
|----------|--------|-------------|
| `BACKEND_URL` | `http://localhost:8000` | URL complète du backend |
| `BACKEND_HOST` | `0.0.0.0` | Host du serveur backend |
| `BACKEND_PORT` | `8000` | Port du serveur backend |
| `FRONTEND_URL` | `http://localhost:3000` | URL du frontend (pour CORS) |
| `DEBUG_MODE` | `false` | Active les logs détaillés |
| `LOG_LEVEL` | `INFO` | Niveau de log (DEBUG, INFO, WARNING, ERROR) |

### Frontend

| Variable | Défaut | Description |
|----------|--------|-------------|
| `REACT_APP_BACKEND_URL` | `http://localhost:8000` | URL du backend pour React |
| `REACT_APP_PEERJS_HOST` | `localhost` | Host du serveur PeerJS |
| `REACT_APP_PEERJS_PORT` | `9000` | Port du serveur PeerJS |

### PeerJS

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PEERJS_HOST` | `0.0.0.0` | Host du serveur PeerJS |
| `PEERJS_PORT` | `9000` | Port du serveur PeerJS |
| `PEERJS_CORS_ORIGINS` | `http://localhost:3000,http://localhost:8000` | URLs autorisées pour CORS |

## 🔄 Migration depuis l'Ancienne Configuration

### Avant (hardcodé)
```javascript
const API_BASE_URL = 'http://localhost:8000';
const ws = new WebSocket('ws://localhost:8000/ws/room123');
```

### Après (avec variables d'environnement)
```javascript
import { BACKEND_HTTP_BASE, BACKEND_WS_BASE } from '../config';
const API_BASE_URL = BACKEND_HTTP_BASE;
const ws = new WebSocket(`${BACKEND_WS_BASE}/ws/room123`);
```

## 🏭 Configuration pour la Production

### 1. Créer la Configuration de Production

```bash
./setup-env.sh production
```

### 2. Modifier les URLs

Éditez le fichier `.env` et remplacez :

```bash
# Exemple pour un domaine de production
BACKEND_URL=https://votre-domaine.com
FRONTEND_URL=https://votre-domaine.com
REACT_APP_BACKEND_URL=https://votre-domaine.com
REACT_APP_PEERJS_HOST=votre-domaine.com
PEERJS_CORS_ORIGINS=https://votre-domaine.com
```

### 3. SSL/TLS (Optionnel)

Pour activer HTTPS, placez vos certificats dans le dossier `ssl/` :

```
ssl/
├── key.pem
└── cert.pem
```

Le script détectera automatiquement ces fichiers et activera SSL.

## 🐛 Débogage

### Vérifier la Configuration

```bash
# Vérifier les variables d'environnement
cat .env

# Vérifier la configuration PeerJS générée
cat peerjs-config.json
```

### Logs Détaillés

Pour activer les logs détaillés, modifiez `.env` :

```bash
DEBUG_MODE=true
LOG_LEVEL=DEBUG
```

## 📝 Exemples de Configuration

### Développement Local
```bash
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_PEERJS_HOST=localhost
```

### Développement sur Réseau Local
```bash
BACKEND_URL=http://192.168.1.100:8000
FRONTEND_URL=http://192.168.1.100:3000
REACT_APP_BACKEND_URL=http://192.168.1.100:8000
REACT_APP_PEERJS_HOST=192.168.1.100
```

### Production avec Domaine
```bash
BACKEND_URL=https://mon-jeu.com
FRONTEND_URL=https://mon-jeu.com
REACT_APP_BACKEND_URL=https://mon-jeu.com
REACT_APP_PEERJS_HOST=mon-jeu.com
```

## 🔧 Scripts Utilitaires

### Génération de Configuration PeerJS
```bash
# Développement
node generate-peerjs-config.js development

# Production
node generate-peerjs-config.js production
```

### Vérification des URLs
```bash
# Tester le backend
curl http://localhost:8000/rooms

# Tester PeerJS
curl http://localhost:9000
```

## ⚠️ Notes Importantes

1. **Sécurité** : Ne jamais commiter le fichier `.env` avec des vraies clés de production
2. **CORS** : Assurez-vous que `FRONTEND_URL` correspond exactement à l'URL utilisée par les clients
3. **WebSocket** : Les URLs WebSocket sont automatiquement converties (ws:// pour HTTP, wss:// pour HTTPS)
4. **Images** : Les URLs d'images utilisent automatiquement `BACKEND_URL` comme base

## 🆘 Dépannage

### Problème de CORS
- Vérifiez que `FRONTEND_URL` dans `.env` correspond à l'URL réelle
- Redémarrez le backend après modification

### Problème de WebSocket
- Vérifiez que `BACKEND_URL` utilise le bon protocole (http/https)
- Les WebSockets utilisent automatiquement ws/wss selon le protocole

### Problème PeerJS
- Régénérez la configuration : `node generate-peerjs-config.js`
- Vérifiez les ports dans `PEERJS_CORS_ORIGINS`
