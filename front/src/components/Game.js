import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = 'ws://localhost:8000';

const Game = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const location = useLocation();
  const isEmbed = typeof window !== 'undefined' && new URLSearchParams(location.search).get('embed') === '1';
  const initialName = typeof window !== 'undefined'
    ? (localStorage.getItem('playerName') || 'Joueur')
    : 'Joueur';
  const [displayName, setDisplayName] = useState(initialName);
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const playerIdRef = useRef(null);
  const [imageData, setImageData] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 400, y: 300 });
  const [isConnected, setIsConnected] = useState(false);
  const [showDronePhoto, setShowDronePhoto] = useState(false);
  const [flash, setFlash] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [droneImageLoaded, setDroneImageLoaded] = useState(false);

  useEffect(() => {
    console.log('Connexion WebSocket à la salle:', roomId);
    const ws = new WebSocket(`${API_BASE_URL}/ws/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connexion WebSocket établie');
      setIsConnected(true);
      // Envoyer le nom au serveur pour validation et enregistrement
      try {
        ws.send(JSON.stringify({ type: 'set_name', name: initialName }));
      } catch {}
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Message reçu:', data);
        
        if (data.type === 'game_state') {
          setGameState(data.game_state);
          setPlayerId(data.player_id);
          playerIdRef.current = data.player_id;
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
          // Afficher la photo du drone uniquement au joueur qui l'a détecté
          if (data.player_id === playerIdRef.current) {
            setShowDronePhoto(true);
            setGameOver(true);
            setFlash(true);
            setTimeout(() => setFlash(false), 250);
          }
        } else if (data.type === 'player_switched') {
          console.log(`🔄 Joueur actuel: ${data.current_player}`);
        } else if (data.type === 'name_status') {
          if (!data.ok) {
            alert(data.reason === 'duplicate' ? 'Ce pseudonyme est déjà pris dans cette salle.' : 'Nom invalide');
          } else if (data.ok && data.name) {
            setDisplayName(String(data.name));
            try { localStorage.setItem('playerName', String(data.name)); } catch {}
          }
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
  }, [roomId, initialName]);

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
    if (gameOver) return;
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
    if (gameOver) return;
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
    if (gameOver) return;
    console.log('🔄 Changement de mode:', mode);
    sendCommand({
      type: 'mode_change',
      mode: mode
    });
  };

  // Pas de changement de joueur: chaque joueur joue sur son PC

  if (!isConnected) {
    return (
      <div className="join-page">
        <div className="panel fade-in" style={{maxWidth: 520, textAlign: 'center'}}>
          <h2 className="panel-title">Connexion au serveur...</h2>
          <div className="animate-spin rounded-full" style={{width: 64, height: 64, border: '4px solid rgba(255,255,255,0.4)', borderTopColor: 'transparent', borderRadius: 9999, margin: '16px auto'}}></div>
          <div className="hint-text">Salle {roomId}</div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="join-page">
        <div className="panel fade-in" style={{maxWidth: 520, textAlign: 'center'}}>
          <h2 className="panel-title">Chargement du jeu...</h2>
          <div className="hint-text">Salle {roomId}</div>
        </div>
      </div>
    );
  }

  // Le créateur est Joueur 1, le second Joueur 2

  return (
    <div className="join-page">
      {!isEmbed && (
        <div className="hero fade-in" style={{marginBottom: 12}}>
        <h1 className="hero-title">🎮 ESCAPE TECH</h1>
        <p className="hero-subtitle">Salle {roomId} · {isConnected ? 'Connecté' : 'Déconnecté'}</p>
        </div>
      )}

      <div className="panel fade-in" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {!isEmbed && (
          <div style={{display: 'flex', gap: 8, marginBottom: 12}}>
            <div className="hint-text">{displayName} (Joueur {playerId})</div>
            <button onClick={() => navigate('/')} className="btn btn-secondary">Quitter</button>
          </div>
        )}

        <div style={{display: 'flex', gap: 8, marginBottom: 16}}>
          <button onClick={() => changeMode('BASE')} className="btn btn-secondary">Base</button>
          <button onClick={() => changeMode('NVG')} className="btn btn-secondary">NVG</button>
          <button onClick={() => changeMode('THERMAL')} className="btn btn-secondary">Thermal</button>
        </div>

        <div 
          className="relative"
          style={{ width: 512, height: 512, borderRadius: 12, overflow: 'hidden', background: '#000', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        >
          {flash && (
            <div className="absolute" style={{inset: 0, background: 'rgba(59,130,246,0.25)'}} />
          )}
          {showDronePhoto && (
            <div
              className="absolute"
              style={{
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)',
                zIndex: 60
              }}
            >
              {!droneImageLoaded && (
                <div style={{ color: 'white', textAlign: 'center' }}>
                  <div>Chargement de l'image du drone...</div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>Drone détecté !</div>
                </div>
              )}
              <img
                src={`http://localhost:8000/images/photo_dron.png`}
                alt="Drone détecté"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  borderRadius: 8,
                  objectFit: 'contain',
                  display: droneImageLoaded ? 'block' : 'none'
                }}
                onLoad={() => {
                  console.log('✅ Image du drone chargée avec succès');
                  setDroneImageLoaded(true);
                }}
                onError={(e) => {
                  console.error('❌ Erreur chargement image drone:', e);
                  setDroneImageLoaded(false);
                }}
              />
            </div>
          )}
          {imageData ? (
            <img src={imageData} alt="Vue du joueur" width={512} height={512} style={{ width: 512, height: 512, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div className="hint-text" style={{display:'flex', alignItems:'center', justifyContent:'center', width: '100%', height: '100%'}}>Chargement de l'image...</div>
          )}

          <div
            className="absolute"
            style={{
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

        {gameOver && (
          <div className="hint-text" style={{marginTop: 8, color: '#a7f3d0'}}>Drone détecté ! Partie terminée</div>
        )}
      </div>
    </div>
  );
};

export default Game;