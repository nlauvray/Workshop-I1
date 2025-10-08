import React, { useEffect, useRef, useState } from 'react';
import { imageUrl } from '../config';
import { useParams } from 'react-router-dom';

// Debug utilities - only initialize if debug mode is enabled
const DEBUG_MODE = process.env.REACT_APP_DEBUG_MODE === 'true';

// Initialize debug functions only if debug mode is enabled
let debugAeroport, debugGameEmbed, debugUI;

if (DEBUG_MODE) {
  const debugLog = (category, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [AEROPORT-${category}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  };

  debugAeroport = (message, data = null) => debugLog('AEROPORT', message, data);
  debugGameEmbed = (message, data = null) => debugLog('GAME-EMBED', message, data);
  debugUI = (message, data = null) => debugLog('UI', message, data);
} else {
  // No-op functions when debug is disabled
  debugAeroport = () => {};
  debugGameEmbed = () => {};
  debugUI = () => {};
}

// Assets served by backend static directory: /images/assets
const photoIcon = imageUrl('/images/assets/camera.png');
const gpsIcon = imageUrl('/images/assets/radar.png');
const radioIcon = imageUrl('/images/assets/walkie_talkie.png');
const mapIcon = imageUrl('/images/assets/map.png');
const bgAeroport = imageUrl('/images/assets/airport.png');

const droneCode = '10388';

// Lightweight Leaflet loader and map component (no react-leaflet dependency)
function LeafletMap({ center, zoom, markerPos, onMapClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Inject Leaflet CSS/JS from CDN once
    const ensureLeaflet = async () => {
      if (window.L && window.L.map) {
        setReady(true);
        return;
      }
      await new Promise((resolve) => {
        // CSS
        if (!document.getElementById('leaflet-css-cdn')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css-cdn';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        // JS
        if (document.getElementById('leaflet-js-cdn')) {
          const s = document.getElementById('leaflet-js-cdn');
          if (s.getAttribute('data-loaded') === 'true') return resolve();
          s.addEventListener('load', () => resolve());
          return;
        }
        const script = document.createElement('script');
        script.id = 'leaflet-js-cdn';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
          script.setAttribute('data-loaded', 'true');
          resolve();
        };
        document.body.appendChild(script);
      });
      setReady(true);
    };
    ensureLeaflet();
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    if (!mapRef.current) {
      const L = window.L;
      mapRef.current = L.map(containerRef.current).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
      mapRef.current.on('click', (e) => {
        if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
      });
    } else {
      mapRef.current.setView(center, zoom);
    }
  }, [ready, center, zoom, onMapClick]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = window.L;
    if (markerPos) {
      if (!markerRef.current) {
        markerRef.current = L.marker(markerPos).addTo(mapRef.current);
      } else {
        markerRef.current.setLatLng(markerPos);
      }
    } else if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }, [ready, markerPos]);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: 8, overflow: 'hidden' }} />
  );
}

const AeroportGame = ({ session = { mode: 'create', code: '', pseudo: 'Joueur' }, onNext = () => {} }) => {
  const { roomId } = useParams();
  const playerName = typeof window !== 'undefined' ? (localStorage.getItem('playerName') || 'Joueur') : 'Joueur';
  
  // AeroportGame est maintenant le jeu principal coopératif
  const [popup, setPopup] = useState(null); // 'photo' | 'gps' | 'radio' | 'carte' | null
  const [photoTaken, setPhotoTaken] = useState(false);
  const [codeEntered, setCodeEntered] = useState('');
  const [gpsValidated, setGpsValidated] = useState(false);
  const [coords, setCoords] = useState('');
  const [showGame, setShowGame] = useState(false);
  const [droneFound, setDroneFound] = useState(false); // État persistant du drone trouvé

  // Debug: Log component initialization
  useEffect(() => {
    debugAeroport('Component initialized', {
      roomId,
      playerName,
      session,
      debugMode: DEBUG_MODE
    });
  }, [roomId, playerName, session]);

  // L'état du drone trouvé est maintenant individuel par joueur
  // Pas de synchronisation globale - seul le joueur qui trouve le drone le voit

  const openCameraGame = () => {
    debugAeroport('Opening camera game', { roomId, playerName });
    setShowGame(true);
    setPopup('photo');
  };

  const renderPopup = () => {
    const textStyle = { color: '#111' };
    if (popup === 'photo') {
      return (
        <div className="popup-obj" style={popupStyle}>
          <h3 style={textStyle}>Appareil photo de surveillance</h3>
       
          {showGame && (
            <div style={{ margin: '12px 0', width: 540, height: 560, borderRadius: 12, overflow: 'hidden', boxShadow: '0 6px 18px #0004' }}>
              <GameEmbed 
                roomId={roomId} 
                playerName={playerName}
                droneFound={droneFound}
                onGameComplete={() => {
                  setPhotoTaken(true);
                  setDroneFound(true); // Marquer le drone comme trouvé de façon persistante
                }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { 
              setPopup(null); 
            }}>Fermer</button>
          </div>
        </div>
      );
    }
    if (popup === 'gps') {
      return (
        <div className="popup-obj" style={popupStyle}>
          <h3 style={textStyle}>Appareil GPS</h3>
          <input
            placeholder="Entrer le code du drone"
            value={codeEntered}
            onChange={(e) => setCodeEntered(e.target.value)}
            disabled={gpsValidated}
          />
          <button
            onClick={() => { 
              debugAeroport('GPS code validation attempt', { 
                codeEntered, 
                droneCode, 
                isValid: codeEntered === droneCode,
                roomId,
                playerName
              });
              if (codeEntered === droneCode) {
                debugAeroport('GPS code validated successfully', { roomId, playerName });
                setGpsValidated(true);
              } else {
                debugAeroport('GPS code validation failed', { 
                  entered: codeEntered, 
                  expected: droneCode,
                  roomId,
                  playerName
                });
              }
            }}
            disabled={gpsValidated || !photoTaken || !codeEntered}
          >
            Valider
          </button>
          {gpsValidated && <span style={{ color: 'green', marginLeft: 16 }}>Signal récupéré !</span>}
          <button onClick={() => {
            debugUI('GPS popup closed');
            setPopup(null);
          }} style={{ marginLeft: 8 }}>Fermer</button>
        </div>
      );
    }
    if (popup === 'radio') {
      return (
        <div className="popup-obj" style={popupStyle}>
          <h3 style={textStyle}>Radio</h3>
          <p style={textStyle}>Permet de communiquer avec l'autre joueur (chat vocal à venir).</p>
          <button onClick={() => {
            debugUI('Radio popup closed');
            setPopup(null);
          }}>Fermer</button>
        </div>
      );
    }
    if (popup === 'carte') {
      const marker = coords ? coords.split(',').map(Number) : null;
      return (
        <div className="popup-obj" style={{ ...popupStyle, minWidth: '420px' }}>
          <h3 style={textStyle}>Carte interactive</h3>
          <p style={textStyle}>Cliquez sur la carte pour placer un point et lire ses coordonnées.</p>
          <div style={{ width: 360, height: 300, marginBottom: 16 }}>
            <LeafletMap
              center={[48.8566, 2.3522]}
              zoom={13}
              markerPos={marker}
              onMapClick={(lat, lng) => {
                const newCoords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                debugAeroport('Map coordinates selected', {
                  lat: lat.toFixed(5),
                  lng: lng.toFixed(5),
                  coords: newCoords,
                  roomId,
                  playerName
                });
                setCoords(newCoords);
              }}
            />
          </div>
          {coords && <span style={{ color: 'green', marginBottom: 8 }}>Coordonnées : <b>{coords}</b></span>}
          <button onClick={() => {
            debugUI('Map popup closed');
            setPopup(null);
          }} style={{ marginLeft: 8 }}>Fermer</button>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="salle1-container"
      style={{
        display: 'flex',
        flexDirection: 'row',
        minHeight: '100vh',
        width: '100vw',
        background: `url(${bgAeroport}) center center/cover no-repeat fixed`,
        position: 'relative',
      }}
    >
      <div
        style={{
          flex: 2.5,
          padding: 32,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          background: 'transparent',
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          boxShadow: 'none',
        }}
      >
        <h2>🎮 ESCAPE TECH - Mission IA Dysfonctionnelle</h2>
        <p>
          <strong>Salle 1 : Aéroport</strong> | Session : {session.mode === 'create' ? 'Créateur' : 'Participant'} | Code : {roomId} | Pseudo : {playerName}
        </p>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '8px' }}>
          Coopération obligatoire - 2 joueurs requis pour cette mission
        </p>
        
        
        <div style={{ margin: '32px 0' }}>
          <span style={{ color: '#888' }}></span>
        </div>
        {coords && <button onClick={onNext} style={{ marginTop: 32 }}>Passer à la salle suivante</button>}
      </div>

      <div
        style={{
          width: 200,
          padding: 24,
          minHeight: '100vh',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          background: '#2f2f2fcc',
          boxShadow: '-2px 0 16px #0006, inset 0 0 0 2px #1a1a1a, inset 0 0 0 4px #4a4a4a',
          borderLeft: '4px solid #000',
        }}
      >
        <h3 style={{
          color: '#eee',
          textTransform: 'uppercase',
          letterSpacing: 1,
          margin: 0,
          padding: '8px 0',
          width: '100%',
          textAlign: 'center',
          borderBottom: '2px solid #1a1a1a',
        }}>Inventaire</h3>

        <div style={invGridStyle}>
          <button style={slotBtnStyle} onClick={openCameraGame} title="Appareil photo">
            <img src={photoIcon} alt="Appareil" style={imgBtnStyle} />
          </button>
          <button style={slotBtnStyle} onClick={() => {
            debugUI('GPS popup opened', { photoTaken, roomId, playerName });
            setPopup('gps');
          }} disabled={!photoTaken} title="Appareil GPS">
            <img src={gpsIcon} alt="GPS" style={imgBtnStyle} />
          </button>
          <button style={slotBtnStyle} onClick={() => {
            debugUI('Radio popup opened', { roomId, playerName });
            setPopup('radio');
          }} title="Radio">
            <img src={radioIcon} alt="Radio" style={imgBtnStyle} />
          </button>
          <button style={slotBtnStyle} onClick={() => {
            debugUI('Map popup opened', { gpsValidated, roomId, playerName });
            setPopup('carte');
          }} disabled={!gpsValidated} title="Carte">
            <img src={mapIcon} alt="Carte" style={imgBtnStyle} />
          </button>
        </div>
      </div>


      {popup && (
        <div
          onClick={() => {
            debugUI('Popup overlay clicked - closing popup');
            setPopup(null);
          }}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: '#0008', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            {renderPopup()}
          </div>
        </div>
      )}
    </div>
  );
};

const invGridStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  marginTop: 8,
};

const slotBtnStyle = {
  width: 96,
  height: 96,
  background: '#8d8d8d',
  border: '2px solid #6b6b6b',
  boxShadow: 'inset 0 2px 0 #bdbdbd, inset 0 -2px 0 #5a5a5a, 0 2px 4px #0005',
  borderRadius: 2,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.05s ease',
};

const imgBtnStyle = {
  width: '48px',
  height: '48px',
  objectFit: 'contain',
  display: 'block',
  margin: '0 auto',
};

const popupStyle = {
  background: '#fff',
  padding: '32px',
  borderRadius: '16px',
  minWidth: '320px',
  boxShadow: '0 8px 32px #0004',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

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
    const API_BASE_URL = 'ws://localhost:8000';
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

export default AeroportGame;


