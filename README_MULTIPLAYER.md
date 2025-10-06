# 🎮 Escape Game - Mode Multi-Joueurs

Application React + FastAPI pour un jeu de détection de drone en mode multi-joueurs.

## 🚀 Démarrage rapide

### 1. Backend (FastAPI)
```bash
# Rendre le script exécutable
chmod +x start_backend.sh

# Démarrer le backend
./start_backend.sh
```
Le backend sera disponible sur `http://localhost:8000`

### 2. Frontend (React)
```bash
# Dans un nouveau terminal
chmod +x start_frontend.sh

# Démarrer le frontend
./start_frontend.sh
```
Le frontend sera disponible sur `http://localhost:3000`

## 🎯 Comment jouer

### Pour 2 joueurs sur le même PC :
1. Ouvrez `http://localhost:3000` dans votre navigateur
2. Un joueur clique sur "Créer une salle"
3. L'autre joueur clique sur "Rejoindre une salle" et entre l'ID de la salle

### Pour 2 joueurs sur des PC différents :
1. Trouvez l'adresse IP de votre PC :
   ```bash
   # Sur Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Sur Windows
   ipconfig
   ```
2. Modifiez l'URL dans le frontend pour utiliser votre IP :
   - Ouvrez `front/src/components/Lobby.js`
   - Changez `const API_BASE_URL = 'http://localhost:8000';` en `const API_BASE_URL = 'http://VOTRE_IP:8000';`
3. Les joueurs accèdent à `http://VOTRE_IP:3000`

## 🎮 Fonctionnalités

- **Mode multi-joueurs** : Jusqu'à 2 joueurs par salle
- **Modes de caméra** : Base, NVG (vision nocturne), Thermal
- **Détection de drone** : Cliquez sur le drone en mode thermal
- **Scores en temps réel** : Suivi des points de chaque joueur
- **Interface moderne** : Design responsive avec animations

## 🛠️ Structure du projet

```
Workshop-I1/
├── backend/
│   └── app.py              # Serveur FastAPI avec WebSocket
├── front/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Lobby.js    # Page d'accueil
│   │   │   └── Game.js     # Interface de jeu
│   │   ├── App.js          # Routeur principal
│   │   └── App.css         # Styles
│   └── package.json
├── images/                  # Images du jeu
├── requirements.txt        # Dépendances Python
├── start_backend.sh        # Script de démarrage backend
├── start_frontend.sh       # Script de démarrage frontend
└── README_MULTIPLAYER.md   # Ce fichier
```

## 🔧 Dépendances

### Backend (Python)
- fastapi
- uvicorn
- websockets
- numpy
- Pillow

### Frontend (React)
- react
- react-router-dom
- axios

## 🎯 Règles du jeu

1. **Objectif** : Trouver et cliquer sur le drone
2. **Modes de caméra** :
   - **Base** : Vue normale
   - **NVG** : Vision nocturne (vert)
   - **Thermal** : Vision thermique (rouge/orange)
3. **Détection** : Seulement en mode thermal, cliquez sur le drone
4. **Scores** : Chaque détection rapporte 1 point
5. **Tours** : Utilisez "Changer de joueur" pour passer le tour

## 🐛 Dépannage

### Problème de connexion WebSocket
- Vérifiez que le backend est démarré sur le port 8000
- Vérifiez les paramètres CORS dans `backend/app.py`

### Images ne se chargent pas
- Vérifiez que les images sont dans le dossier `images/`
- Vérifiez les chemins dans `backend/app.py`

### Problème de réseau
- Vérifiez que les ports 3000 et 8000 sont ouverts
- Vérifiez les paramètres de pare-feu

## 📝 Notes de développement

- Le backend utilise WebSocket pour la communication temps réel
- Les images sont encodées en base64 pour le transfert
- L'état du jeu est synchronisé entre tous les joueurs
- Interface responsive qui s'adapte à la taille de l'écran
