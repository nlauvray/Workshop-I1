#!/usr/bin/env node

/**
 * Script pour générer la configuration PeerJS basée sur les variables d'environnement
 * Usage: node generate-peerjs-config.js [environment]
 * 
 * Variables d'environnement supportées:
 * - PEERJS_HOST (défaut: 0.0.0.0)
 * - PEERJS_PORT (défaut: 9000)
 * - PEERJS_CORS_ORIGINS (défaut: http://localhost:3000,http://localhost:8000)
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis le fichier .env si il existe
function loadEnvFile(envFile) {
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

// Déterminer l'environnement
const environment = process.argv[2] || 'development';
const envFile = environment === 'production' ? '.env.production' : '.env';

// Charger les variables d'environnement
loadEnvFile(envFile);

// Configuration par défaut
const defaultConfig = {
  port: 9000,
  path: '/',
  host: '0.0.0.0',
  key: 'peerjs',
  allow_discovery: true,
  proxied: false,
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8000']
  },
  cleanup_out_msgs: 1000
};

// Configuration basée sur les variables d'environnement
const config = {
  port: parseInt(process.env.PEERJS_PORT || defaultConfig.port),
  path: defaultConfig.path,
  host: process.env.PEERJS_HOST || defaultConfig.host,
  key: defaultConfig.key,
  allow_discovery: defaultConfig.allow_discovery,
  proxied: defaultConfig.proxied,
  cors: {
    origin: process.env.PEERJS_CORS_ORIGINS 
      ? process.env.PEERJS_CORS_ORIGINS.split(',')
      : defaultConfig.cors.origin
  },
  cleanup_out_msgs: defaultConfig.cleanup_out_msgs
};

// Ajouter SSL si en production et si les certificats existent
if (environment === 'production') {
  const sslKey = 'ssl/key.pem';
  const sslCert = 'ssl/cert.pem';
  
  if (fs.existsSync(sslKey) && fs.existsSync(sslCert)) {
    config.ssl = {
      key: sslKey,
      cert: sslCert
    };
  }
}

// Écrire le fichier de configuration
const configPath = path.join(__dirname, 'peerjs-config.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log(`✅ Configuration PeerJS générée pour l'environnement: ${environment}`);
console.log(`📁 Fichier: ${configPath}`);
console.log(`🔧 Configuration:`);
console.log(`   - Host: ${config.host}`);
console.log(`   - Port: ${config.port}`);
console.log(`   - CORS Origins: ${config.cors.origin.join(', ')}`);
if (config.ssl) {
  console.log(`   - SSL: Activé`);
}
