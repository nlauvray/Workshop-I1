# 🎮 Jeu Multi-Joueurs Drone Detection

## 🚀 Démarrage Rapide

### Option 1: Script automatique (Recommandé)
```bash
./start_all.sh
```

### Option 2: Démarrage manuel
```bash
# Terminal 1 - Backend
./start_backend.sh

# Terminal 2 - Frontend  
./start_frontend.sh
```

## 🛑 Arrêt

### Arrêt automatique
```bash
./stop_all.sh
```

### Ou Ctrl+C dans le terminal où vous avez lancé `./start_all.sh`

## 🎯 Comment jouer

1. **Ouvrez** http://localhost:3000 dans votre navigateur
2. **Créez une salle** de jeu
3. **Partagez l'ID** de la salle avec un autre joueur
4. **Jouez ensemble !**

## 🎮 Contrôles

- **Souris** : Déplace le viseur
- **Boutons de mode** : Change l'affichage (BASE, NVG, THERMAL)
- **Clic** : Détecte le drone (en mode THERMAL)

## 🔧 Dépannage

Si quelque chose ne marche pas :
```bash
./stop_all.sh
./start_all.sh
```

## 📁 Structure

```
Workshop-I1/
├── start_all.sh      # 🚀 Démarre tout
├── stop_all.sh       # 🛑 Arrête tout
├── backend/          # Serveur FastAPI
├── front/           # Interface React
└── images/          # Images du jeu
```

## 🎯 Objectif

Trouvez le drone en mode THERMAL en cliquant dessus !
