#!/bin/bash

# Script pour démarrer le backend FastAPI
echo "🚀 Démarrage du backend FastAPI..."

# Activer l'environnement virtuel si il existe
if [ -d "venv" ]; then
    echo "📦 Activation de l'environnement virtuel..."
    source venv/bin/activate
fi

# Installer les dépendances si nécessaire
echo "📥 Installation des dépendances..."
pip install -r requirements.txt

# Démarrer le serveur FastAPI
echo "🌐 Démarrage du serveur sur http://localhost:8000"
python backend/app.py
