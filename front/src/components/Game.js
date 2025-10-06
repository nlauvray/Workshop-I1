import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'ws://localhost:8000';

const Game = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [imageData, setImageData] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 400, y: 300 });
  const [isConnected, setIsConnected] = useState(false);
  const [showDronePhoto, setShowDronePhoto] = useState(false);

  useEffect(() => {
    console.log('Connexion WebSocket à la salle:', roomId);
    const ws = new WebSocket(`${API_BASE_URL}/ws/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connexion WebSocket établie');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Message reçu:', data);
        
        if (data.type === 'game_state') {
          setGameState(data.game_state);
          setPlayerId(data.player_id);
          setImageData(data.image_data);
          console.log('🎮 État du jeu mis à jour');
        } else if (data.type === 'frame') {
          // Nouveau frame 512x512 avec image mise à jour
          setImageData(data.image_data);
          setGameState(prev => ({
            ...prev,
            [`player${data.player_id}`]: {
              ...prev[`player${data.player_id}`],
              position: data.position
            }
          }));
          setMousePosition({ x: data.position.x, y: data.position.y });
          
        } else if (data.type === 'drone_detected') {
          setShowDronePhoto(true);
          setTimeout(() => setShowDronePhoto(false), 2000);
        } else if (data.type === 'player_switched') {
          console.log(`🔄 Joueur actuel: ${data.current_player}`);
        }
      } catch (error) {
        console.error('❌ Erreur parsing message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 Connexion WebSocket fermée:', event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('❌ Erreur WebSocket:', error);
      setIsConnected(false);
    };

    return () => {
      console.log('🧹 Nettoyage WebSocket');
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId]);

  const sendCommand = (command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('📤 Envoi commande:', command);
      wsRef.current.send(JSON.stringify(command));
    } else {
      console.log('❌ WebSocket non connecté');
    }
  };

  // OPTIMISATION: Throttling pour éviter trop de messages
  const lastMoveTime = useRef(0);
  const MOVE_THROTTLE = 50; // 50ms entre les messages de mouvement

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('🖱️ Mouse move:', { x, y, mousePosition }); // DEBUG
    
    // Mettre à jour la position immédiatement pour le viseur (comme main.py on_move)
    setMousePosition({ x, y });
    
    // Envoyer au serveur (throttled)
    const now = Date.now();
    if (now - lastMoveTime.current >= MOVE_THROTTLE) {
      lastMoveTime.current = now;
      sendCommand({
        type: 'move',
        position: { x, y }
      });
    }
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('🖱️ Clic à:', x, y);
    sendCommand({
      type: 'click',
      x: x,
      y: y
    });
  };

  const changeMode = (mode) => {
    console.log('🔄 Changement de mode:', mode);
    sendCommand({
      type: 'mode_change',
      mode: mode
    });
  };

  // Pas de changement de joueur: chaque joueur joue sur son PC

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Connexion à la salle {roomId}...</p>
          <p className="text-gray-400 text-sm mt-2">Vérifiez que le backend est démarré</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Chargement du jeu...</p>
          <p className="text-gray-400 text-sm mt-2">Attente des données du serveur</p>
        </div>
      </div>
    );
  }

  // Le créateur est Joueur 1, le second Joueur 2

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">🎮 Escape Game</h1>
            <span className="bg-blue-600 px-3 py-1 rounded-full text-sm">
              Salle: {roomId}
            </span>
            <span className="bg-green-600 px-3 py-1 rounded-full text-sm">
              Joueur {playerId}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition duration-300"
          >
            Quitter
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div className="max-w-3xl mx-auto p-4">
        <div className="grid grid-cols-1 gap-8">
          {/* Joueur 1 */}
          <div className={`bg-gray-800 rounded-lg p-6 border-2 border-yellow-400`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Joueur 1</h2>
              <div className="text-2xl font-bold text-yellow-400">
                Score: {gameState.player1.score}
              </div>
              {showDronePhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
                  <img src={`http://localhost:8000/images/photo_dron.png`} alt="Drone" className="max-w-full max-h-full rounded shadow-lg" />
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Contrôles */}
              <div className="flex space-x-2">
                <button
                  onClick={() => changeMode('BASE')}
                  className={`px-4 py-2 rounded-lg transition duration-300 ${
                    gameState.player1.mode === 'BASE' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Base
                </button>
                <button
                  onClick={() => changeMode('NVG')}
                  className={`px-4 py-2 rounded-lg transition duration-300 ${
                    gameState.player1.mode === 'NVG' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  NVG
                </button>
                <button
                  onClick={() => changeMode('THERMAL')}
                  className={`px-4 py-2 rounded-lg transition duration-300 ${
                    gameState.player1.mode === 'THERMAL' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Thermal
                </button>
              </div>

              {/* Zone de jeu 512x512 pour correspondre aux coordonnées */}
              <div 
                className="relative bg-black rounded-lg overflow-hidden cursor-crosshair"
                style={{ width: '512px', height: '512px' }}
                onMouseMove={handleMouseMove}
                onClick={handleClick}
              >
                {imageData ? (
                  <img
                    src={imageData}
                    alt="Vue du joueur"
                    width={512}
                    height={512}
                    style={{ width: '512px', height: '512px', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Chargement de l'image...
                  </div>
                )}
                
                {/* Foyer - exactement comme main.py */}
                <div
                  className="absolute border-4 border-yellow-400 pointer-events-none bg-yellow-400 bg-opacity-20"
                  style={{
                    left: mousePosition.x - 30,
                    top: mousePosition.y - 30,
                    width: '60px',
                    height: '60px',
                    zIndex: 10,
                    position: 'absolute'
                  }}
                />
                {/* DEBUG: Position du viseur */}
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs p-2 rounded z-50">
                  Viseur: ({Math.round(mousePosition.x)}, {Math.round(mousePosition.y)})
                </div>
                {/* DEBUG: Viseur visible */}
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs p-2 rounded z-50">
                  Viseur visible: {mousePosition.x > 0 ? 'OUI' : 'NON'}
                </div>
                {/* DEBUG: Viseur position */}
                <div className="absolute top-16 left-2 bg-blue-500 text-white text-xs p-2 rounded z-50">
                  Position: left={mousePosition.x - 30}, top={mousePosition.y - 30}
                </div>
              </div>
            </div>
          </div>

          
        </div>

        {/* Contrôles du jeu - pas de changement de joueur */}

        {/* Instructions */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">Instructions :</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Déplacez la souris pour bouger le foyer de la caméra</li>
            <li>• Changez de mode (Base, NVG, Thermal) avec les boutons</li>
            <li>• En mode Thermal, cliquez sur le drone pour marquer des points</li>
            
          </ul>
        </div>

        {/* Debug Info */}
        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">Debug Info :</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <p>• Connexion: {isConnected ? '✅' : '❌'}</p>
            <p>• Joueur ID: {playerId || 'Non assigné'}</p>
            <p>• Image chargée: {imageData ? '✅' : '❌'}</p>
            <p>• État du jeu: {gameState ? '✅' : '❌'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;