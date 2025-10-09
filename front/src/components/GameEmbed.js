import React, { useEffect, useRef, useState } from 'react';
import { BACKEND_WS_BASE, imageUrl } from '../config';

// Composant GameEmbed qui intègre directement le jeu de drone
function GameEmbed({ roomId, playerName, onGameComplete, droneFound = false }) {
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [imageData, setImageData] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 400, y: 300 });
  const [isConnected, setIsConnected] = useState(false);
  const [showDronePhoto, setShowDronePhoto] = useState(false);
  const [flash, setFlash] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [droneImageLoaded, setDroneImageLoaded] = useState(false);
  const [currentMode, setCurrentMode] = useState('BASE'); // Mode par défaut
  const wsRef = useRef(null);
  const playerIdRef = useRef(null);

  useEffect(() => {
    const API_BASE_URL = BACKEND_WS_BASE;
    const ws = new WebSocket(`${API_BASE_URL}/ws/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      try { 
        ws.send(JSON.stringify({ type: 'set_name', name: playerName })); 
        // Envoyer le mode BASE dès la connexion
        ws.send(JSON.stringify({ type: 'mode_change', mode: 'BASE' }));
      } catch {}
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'game_state') {
          setGameState(data.game_state);
          setPlayerId(data.player_id);
          playerIdRef.current = data.player_id;
          setImageData(data.image_data);
        } else if (data.type === 'frame') {
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
          // Seul le joueur qui a trouvé le drone voit l'image
          if (data.player_id === playerIdRef.current) {
            setShowDronePhoto(true);
            setGameOver(true);
            setFlash(true);
            setTimeout(() => setFlash(false), 250);
            onGameComplete();
          }
        }
      } catch (error) {
        console.error('Erreur parsing message:', error);
      }
    };

    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, playerName, onGameComplete]);

  const sendCommand = (command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command));
    }
  };

  const handleMouseMove = (e) => {
    if (gameOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
    sendCommand({ type: 'move', position: { x, y } });
  };

  const handleClick = (e) => {
    if (gameOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    sendCommand({ type: 'click', x: x, y: y });
  };

  const changeMode = (mode) => {
    if (gameOver) return;
    setCurrentMode(mode); // Mettre à jour l'état local
    sendCommand({ type: 'mode_change', mode: mode });
  };

  if (!isConnected) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Connexion...</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative' }}>
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 8, 
        padding: 8, 
        background: 'rgba(0,0,0,0.8)', 
        borderRadius: '4px 4px 0 0',
        borderBottom: '1px solid #333'
      }}>
      
        <button 
          onClick={() => changeMode('BASE')} 
          style={{ 
            padding: '4px 8px', 
            fontSize: 12, 
            background: currentMode === 'BASE' ? '#3b82f6' : '#333', 
            color: '#fff', 
            border: '1px solid #555' 
          }}
        >
          Caméra
        </button>
        <button 
          onClick={() => changeMode('NVG')} 
          style={{ 
            padding: '4px 8px', 
            fontSize: 12, 
            background: currentMode === 'NVG' ? '#3b82f6' : '#333', 
            color: '#fff', 
            border: '1px solid #555' 
          }}
        >
          Caméra mode nocturne
        </button>
        <button 
          onClick={() => changeMode('THERMAL')} 
          style={{ 
            padding: '4px 8px', 
            fontSize: 12, 
            background: currentMode === 'THERMAL' ? '#3b82f6' : '#333', 
            color: '#fff', 
            border: '1px solid #555' 
          }}
        >
          Caméra mode thermique
        </button>
      </div>

      <div 
        style={{ 
          width: 512, 
          height: 512, 
          borderRadius: 8, 
          overflow: 'hidden', 
          background: '#000', 
          cursor: 'crosshair',
          position: 'relative',
          margin: '0 auto'
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {flash && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(59,130,246,0.25)' }} />
        )}
        {(showDronePhoto || droneFound) && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', 
            justifyContent: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 60
          }}>
            {!droneImageLoaded && (
              <div style={{ color: 'white', textAlign: 'center' }}>
                <div>Chargement de l'image du drone...</div>
                <div style={{ marginTop: 8, fontSize: 12 }}>Drone détecté !</div>
              </div>
            )}
            <img
              src={imageUrl('images/photo_dron.png')}
              alt="Drone détecté"
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                borderRadius: 8,
                objectFit: 'contain',
                display: droneImageLoaded ? 'block' : 'none'
              }}
              onLoad={() => {
                console.log('✅ Image du drone chargée avec succès dans AeroportGame');
                setDroneImageLoaded(true);
              }}
              onError={(e) => {
                console.error('❌ Erreur chargement image drone dans AeroportGame:', e);
                setDroneImageLoaded(false);
              }}
            />
          </div>
        )}
        {imageData ? (
          <img 
            src={imageData} 
            alt="Vue du joueur" 
            width={512} 
            height={512} 
            style={{ width: 512, height: 512, objectFit: 'cover', display: 'block' }} 
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#fff' }}>
            Chargement...
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            left: mousePosition.x - 30,
            top: mousePosition.y - 30,
            width: 60,
            height: 60,
            border: '4px solid #facc15',
            background: 'rgba(250, 204, 21, 0.2)',
            pointerEvents: 'none'
          }}
        />
      </div>

    </div>
  );
}

export default GameEmbed;
