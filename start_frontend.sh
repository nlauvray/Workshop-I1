#!/bin/bash

# Script pour démarrer le frontend React
echo "🚀 Démarrage du frontend React..."

# Aller dans le dossier front
cd front

# Installer les dépendances si nécessaire
echo "📥 Installation des dépendances npm..."
npm install

# Démarrer le serveur de développement React
echo "🌐 Démarrage du serveur de développement sur http://localhost:3000"
npm start
