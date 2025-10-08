import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [showOfficeGame, setShowOfficeGame] = useState(false); // État pour afficher officeGame
  const [showDesktopGame, setShowDesktopGame] = useState(false); // État pour afficher DesktopGame

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

  // Si DesktopGame est activé, afficher DesktopGame
  if (showDesktopGame) {
    return <DesktopGameEmbed roomId={roomId} playerName={playerName} onBack={() => setShowDesktopGame(false)} />;
  }

  // Si officeGame est activé, afficher officeGame
  if (showOfficeGame) {
    return <OfficeGameEmbed roomId={roomId} playerName={playerName} onBack={() => setShowOfficeGame(false)} onDesktop={() => setShowDesktopGame(true)} />;
  }

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

        {/* Bouton pour passer à officeGame */}
        <div style={{ marginTop: '16px', width: '100%' }}>
          <button 
            onClick={() => setShowOfficeGame(true)} 
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            title="Passer au bureau"
          >
            🏢 Bureau
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

// Composant OfficeGameEmbed qui intègre le vrai officeGame
function OfficeGameEmbed({ roomId, playerName, onBack, onDesktop }) {
  const [popup, setPopup] = useState(null); // null | 'j1' | 'j2' | 'book' | 'page' | 'coffre' | 'carte'
  const [hintFound, setHintFound] = useState(false);
  const [encryptedSeen, setEncryptedSeen] = useState(false);
  const [safeCode, setSafeCode] = useState('');
  const [usbFound, setUsbFound] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null); // 'bleu' | 'vert' | 'rouge' | 'bureau'

  const containerRef = useRef(null);
  const [imageNatural, setImageNatural] = useState(null); // { w, h }
  const [bgRect, setBgRect] = useState(null); // { left, top, width, height }

  // Load background image to get natural ratio
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl('/images/assets/bureauSalle2.png');
    img.onload = () => setImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // Recompute displayed image rect on resize to match background-size: contain
  useEffect(() => {
    function computeRect() {
      if (!containerRef.current || !imageNatural) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const rCont = cw / ch;
      const rImg = imageNatural.w / imageNatural.h;
      if (rCont > rImg) {
        const height = ch;
        const width = height * rImg;
        const left = (cw - width) / 2;
        setBgRect({ left, top: 0, width, height });
      } else {
        const width = cw;
        const height = width / rImg;
        const top = (ch - height) / 2;
        setBgRect({ left: 0, top, width, height });
      }
    }
    computeRect();
    window.addEventListener('resize', computeRect);
    return () => window.removeEventListener('resize', computeRect);
  }, [imageNatural]);

  const bgStyle = useMemo(() => ({
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    backgroundColor: '#000',
    backgroundImage: `url(${imageUrl('/images/assets/bureauSalle2.png')})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    backgroundAttachment: 'fixed',
    position: 'relative',
  }), []);

  return (
    <div ref={containerRef} className="salle2-container" style={bgStyle}>
      <div style={{ position: 'absolute', top: 8, left: 12, color: '#fff', textShadow: '0 1px 2px #000' }}>
        <h2 style={{ margin: 0 }}>🏢 ESCAPE TECH - Bureau</h2>
        <small>Salle 2 : Bureau | Code : {roomId} | Pseudo : {playerName}</small>
      </div>

      {/* Bouton retour */}
      <div style={{ position: 'absolute', top: 8, right: 12, display: 'flex', gap: 8 }}>
        <button 
          onClick={onBack}
          style={{
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ← Aéroport
        </button>
        <button 
          onClick={onDesktop}
          style={{
            padding: '8px 16px',
            background: 'rgba(16, 185, 129, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🖥️ Desktop
        </button>
      </div>

      {/* Hotspots */}
      <div style={hotspotsLayer(bgRect)}>
        <button style={{ ...hotspotImgBtn, ...posMap }} onClick={() => setPopup('carte')} title="Carte de l'Europe">
          <img src={imageUrl('/images/assets/Salle2Map.png')} alt="Carte" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreBleu }} onClick={() => { setSelectedBook('bleu'); setPopup('book'); }} title="Livre bleu">
          <img src={imageUrl('/images/assets/Salle2LivreBleu.png')} alt="Livre bleu" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreVert }} onClick={() => { setSelectedBook('vert'); setPopup('book'); }} title="Livre vert">
          <img src={imageUrl('/images/assets/Salle2LivreVert.png')} alt="Livre vert" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreRouge }} onClick={() => { setSelectedBook('rouge'); setPopup('book'); }} title="Livre rouge">
          <img src={imageUrl('/images/assets/Salle2LivreRouge.png')} alt="Livre rouge" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posLivreBureau }} onClick={() => { setSelectedBook('bureau'); setPopup('book'); }} title="Livre sur le bureau">
          <img src={imageUrl('/images/assets/Salle2LivreBureau.png')} alt="Livre sur le bureau" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posPage }} onClick={() => { setEncryptedSeen(true); setPopup('page'); }} title="Page chiffrée">
          <img src={imageUrl('/images/assets/Salle2PageMdp.png')} alt="Page" style={hotspotImg} />
        </button>
        <button style={{ ...hotspotImgBtn, ...posCoffre }} onClick={() => setPopup('coffre')} title="Coffre-fort">
          <img src={imageUrl('/images/assets/Salle2Coffre.png')} alt="Coffre" style={hotspotImg} />
        </button>
      </div>

      {usbFound && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, background: '#000a', color: '#fff', padding: 12, borderRadius: 8 }}>
          Clé USB récupérée ! Vous pouvez continuer.
          <div>
            <button onClick={onDesktop} style={{ marginTop: 8 }}>Accéder au Desktop</button>
          </div>
        </div>
      )}

      {popup && (
        <div style={officeOverlayStyle} onClick={() => setPopup(null)}>
          <div style={officePopupStyle} onClick={(e) => e.stopPropagation()}>
            {popup === 'carte' && (
              <div>
                <h3>Carte de l'Europe</h3>
                <p>Une carte de l'Europe avec des épingles marquant différentes villes.</p>
                <img src={imageUrl('/images/assets/MapEpingle.png')} alt="Carte Europe" style={{ maxWidth: '100%', height: 'auto' }} />
              </div>
            )}
            {popup === 'book' && (
              <OpenBook book={selectedBook} onFoundHint={() => setHintFound(true)} />
            )}
            {popup === 'page' && (
              <div>
                <h3>Page chiffrée</h3>
                <p>Une page avec du texte chiffré. Il faut trouver la clé pour la déchiffrer.</p>
                <img src={imageUrl('/images/assets/Salle2PageMdp.png')} alt="Page chiffrée" style={{ maxWidth: '100%', height: 'auto' }} />
                {hintFound && (
                  <div style={{ marginTop: 16, padding: 12, background: '#f0f8ff', borderRadius: 8 }}>
                    <strong>Indice trouvé :</strong> Utilisez Vigenère avec le mot-clé trouvé dans les livres.
                  </div>
                )}
              </div>
            )}
            {popup === 'coffre' && (
              <SafePad 
                value={safeCode} 
                onChange={setSafeCode} 
                onValidate={() => {
                  if (safeCode === '5279') {
                    setUsbFound(true);
                    setPopup(null);
                  }
                }}
                disabled={false}
                success={usbFound}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles et positions pour officeGame
const officeOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const officePopupStyle = {
  background: '#fff',
  padding: 24,
  borderRadius: 12,
  minWidth: 340,
  boxShadow: '0 8px 32px #0006',
  color: '#111',
};

const hotspotsLayer = (bgRect) => ({
  position: 'absolute',
  left: bgRect ? bgRect.left : 0,
  top: bgRect ? bgRect.top : 0,
  width: bgRect ? bgRect.width : '100%',
  height: bgRect ? bgRect.height : '100%',
  pointerEvents: 'none',
});

const hotspotImgBtn = {
  position: 'absolute',
  width: '6%',
  height: 'auto',
  minWidth: 0,
  minHeight: 0,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  pointerEvents: 'auto',
  transform: 'translate(-50%, -50%)',
};

const hotspotImg = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
};

// Positions des hotspots
const posMap = { left: '22.5%', top: '25%', width: '27%' };
const posLivreBleu = { left: '82%', top: '43.2%', width: '4.1%' };
const posLivreVert = { left: '78.6%', top: '43.5%', width: '1.55%' };
const posLivreRouge = { left: '77%', top: '43%', width: '1.53%' };
const posLivreBureau = { left: '54.9%', top: '55.2%', width: '20%' };
const posPage = { left: '29.6%', top: '60.8%', width: '13.5%' };
const posCoffre = { left: '73.8%', top: '81.2%', width: '14%' };

// Composants pour les livres et le coffre
function OpenBook({ book, onFoundHint }) {
  if (!book) return null;
  const titleMap = {
    bleu: 'Livre bleu — Chiffres et fréquences',
    vert: 'Livre vert — Méthodes modernes',
    rouge: 'Livre rouge — Codes classiques',
    bureau: 'Livre sur le bureau — IA et sécurité',
  };
  const textMap = {
    bleu: (
      <>
        <p>Analyse des fréquences et substitution: utile pour casser des codes simples, mais pas suffisant ici.</p>
      </>
    ),
    vert: (
      <>
        <p>Le chiffre de Vigenère utilise un mot-clé pour décaler les lettres.</p>
        <p>Indice: applique Vigenère sur la page chiffrée pour trouver le PIN du coffre.</p>
        <button onClick={onFoundHint}>Marquer l'indice comme trouvé</button>
      </>
    ),
    rouge: (
      <>
        <p>Code César, ROT13, et variantes — Trop simple pour ce cas.</p>
      </>
    ),
    bureau: (
      <>
        <p>Notes sur une IA concevant des drones autonomes. Mentions «clé», «port», «stockage».</p>
      </>
    ),
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h3>{titleMap[book]}</h3>
      <div style={{
        background: '#fefbf4',
        border: '1px solid #e0d7c2',
        borderRadius: 8,
        padding: 16,
        boxShadow: 'inset 0 0 24px #0001',
        color: '#111',
      }}>
        {textMap[book]}
      </div>
    </div>
  );
}

function SafePad({ value, onChange, onValidate, disabled, success }) {
  const press = (d) => {
    if (disabled) return;
    if (value.length >= 4) return;
    onChange(value + d);
  };
  const clear = () => !disabled && onChange('');
  const back = () => !disabled && onChange(value.slice(0, -1));

  return (
    <div style={{ minWidth: 280 }}>
      <h3>Coffre-fort</h3>
      <p>Entrez un code à 4 chiffres.</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 72px)',
        gap: 8,
        justifyContent: 'center',
      }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(String(n))} disabled={disabled} style={padBtn}>{n}</button>
        ))}
        <button onClick={clear} disabled={disabled} style={padBtn}>C</button>
        <button onClick={() => press('0')} disabled={disabled} style={padBtn}>0</button>
        <button onClick={back} disabled={disabled} style={padBtn}>⌫</button>
      </div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <code style={{ fontSize: 20, letterSpacing: 4 }}>{value.padEnd(4, '•')}</code>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, gap: 8 }}>
        <button onClick={onValidate} disabled={disabled || value.length !== 4}>Déverrouiller</button>
        <span style={{ color: success ? 'green' : '#999' }}>{success ? 'Ouvert ! Clé USB trouvée.' : ''}</span>
      </div>
    </div>
  );
}

const padBtn = {
  width: 72,
  height: 56,
  fontSize: 20,
  borderRadius: 8,
  cursor: 'pointer',
};

// Composant DesktopGameEmbed qui intègre le vrai DesktopGame
function DesktopGameEmbed({ roomId, playerName, onBack }) {
  const [isConnected, setIsConnected] = useState(true); // Simulé comme connecté
  const [folderOpen, setFolderOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const notesKey = `notes_${roomId}`;
  const [notesContent, setNotesContent] = useState(() => {
    if (typeof window === 'undefined') return '';
    try { return sessionStorage.getItem(notesKey) || ''; } catch { return ''; }
  });
  const [folderPos, setFolderPos] = useState({ x: 140, y: 110 });
  const [notesPos, setNotesPos] = useState({ x: 220, y: 80 });
  const [dragTarget, setDragTarget] = useState(null); // 'folder' | 'notes' | null
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [wallpaper, setWallpaper] = useState(imageUrl('/images/os-x-mountain-lion-3840x2160-24066.jpg'));

  // Dock icons (no labels). Folder icon appears only when the folder window is open
  const DOCK_BASE_ICONS = [
    { id: 'notes', label: 'Notes', file: 'Notes-1.png', clickable: true },
    { id: 'mail', label: 'Mail', file: 'gmail_256x256x32.png', clickable: false },
    { id: 'calc', label: 'Calculatrice', file: 'calc 2_256x256x32.png', clickable: false },
    { id: 'clock', label: 'Horloge', file: 'clock 3_256x256x32.png', clickable: false },
    { id: 'trash', label: 'Corbeille', file: 'user-trash_256x256x32.png', clickable: false },
  ];
  const FOLDER_ICON = { id: 'folder', label: 'Dossier', file: 'folder_256x256x32.png', clickable: true };

  useEffect(() => {
    try { sessionStorage.setItem(notesKey, notesContent); } catch {}
  }, [notesContent, notesKey]);

  const startDrag = (target, e) => {
    e.preventDefault();
    const pos = target === 'folder' ? folderPos : notesPos;
    setDragTarget(target);
    setDragOffset({ dx: e.clientX - pos.x, dy: e.clientY - pos.y });
  };

  useEffect(() => {
    if (!dragTarget) return;
    const onMove = (e) => {
      const newPos = { x: e.clientX - dragOffset.dx, y: e.clientY - dragOffset.dy };
      if (dragTarget === 'folder') setFolderPos(newPos); else setNotesPos(newPos);
    };
    const onUp = () => setDragTarget(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragTarget, dragOffset, folderPos, notesPos]);

  const handleIconClick = (icon) => {
    if (!icon.clickable) return;
    if (icon.id === 'folder') {
      setFolderOpen(true);
    } else if (icon.id === 'usb') {
      setFolderOpen(true);
    } else if (icon.id === 'notes') {
      setNotesOpen(true);
    }
  };

  return (
    <div className="join-page">
      <div className="hero fade-in" style={{marginBottom: 12}}>
        <h1 className="hero-title">🖥️ Desktop</h1>
        <p className="hero-subtitle">Salle {roomId} · {isConnected ? 'Connecté' : 'Déconnecté'}</p>
      </div>

      <div className="panel fade-in" style={{width: '100%', maxWidth: 920}}>
        <div style={{display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center'}}>
          <div className="hint-text">{playerName}</div>
          <button onClick={onBack} className="btn btn-secondary">← Retour au bureau</button>
        </div>

        <div className="mac-desktop" style={{
          width: '100%',
          height: 520,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {/* Top bar */}
          <div className="mac-menubar" style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 28,
            background: 'rgba(20,20,22,0.55)', color: 'white', display: 'flex', alignItems: 'center', padding: '0 12px',
            backdropFilter: 'saturate(160%) blur(10px)'
          }}>
            <div style={{fontWeight: 700}}>🍎</div>
            <div style={{marginLeft: 12, fontSize: 12, opacity: 0.85}}>Finder</div>
          </div>

          {/* USB icon on desktop (no label, no rectangle) */}
          <div style={{ position: 'absolute', top: 46, right: 18 }}>
            <button
              onClick={() => handleIconClick({ id: 'usb', clickable: true })}
              title="USB"
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img
                src={imageUrl('/images/icons/usb.png')}
                alt="USB"
                style={{ width: 48, height: 48, imageRendering: 'crisp-edges' }}
              />
            </button>
          </div>

          {/* Notes icon is only in the Dock (not on desktop) */}

          {/* Dock (navbar) at bottom with icons only */}
          <div className="mac-dock" style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 14,
            display: 'flex', alignItems: 'flex-end', gap: 12, padding: '8px 12px',
            background: 'rgba(20,20,22,0.45)', borderRadius: 16,
            backdropFilter: 'saturate(160%) blur(8px)', border: '1px solid rgba(255,255,255,0.25)'
          }}>
            {(folderOpen ? [...DOCK_BASE_ICONS, FOLDER_ICON] : DOCK_BASE_ICONS).map(icon => (
              <button
                key={icon.id}
                className="dock-item"
                onClick={() => handleIconClick(icon)}
                style={{ background: 'transparent', border: 'none', cursor: icon.clickable ? 'pointer' : 'default', padding: 0 }}
                disabled={!icon.clickable}
                title={icon.clickable ? icon.label : undefined}
              >
                <img
                  src={imageUrl(`/images/${icon.file.startsWith('icons/') ? icon.file : 'icons/' + icon.file}`)}
                  alt={icon.label}
                  style={{ width: 44, height: 44, imageRendering: 'crisp-edges' }}
                />
              </button>
            ))}
          </div>

          {/* Folder window */}
          {folderOpen && (
            <div style={{
              position: 'absolute', left: folderPos.x, top: folderPos.y, width: 420, height: 300,
              background: 'rgba(255,255,255,0.9)', borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)', color: '#111',
              overflow: 'hidden', border: '1px solid rgba(0,0,0,0.15)'
            }}>
              <div style={{
                height: 34, background: 'linear-gradient(#f4f4f6, #e8e8ee)',
                display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: '1px solid #d6d6df',
                cursor: 'move', userSelect: 'none'
              }} onMouseDown={(e) => startDrag('folder', e)}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => setFolderOpen(false)} title="Fermer" style={{ width: 12, height: 12, background: '#ff5f57', borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer' }} />
                  <span style={{ width: 12, height: 12, background: '#ffbd2e', borderRadius: 999 }} />
                  <span style={{ width: 12, height: 12, background: '#28c840', borderRadius: 999 }} />
                </div>
                <div style={{ marginLeft: 10, fontSize: 12, fontWeight: 700 }}>Dossier</div>
              </div>
              <div style={{ padding: 16, fontSize: 13, color: '#333' }}>
                Ce dossier est vide pour l'instant. Nous y ajouterons des éléments cliquables ensuite.
              </div>
            </div>
          )}

          {/* Notes window */}
          {notesOpen && (
            <div style={{
              position: 'absolute', left: notesPos.x, top: notesPos.y, width: 480, height: 340,
              background: 'rgba(255,255,255,0.98)', borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)', color: '#111',
              overflow: 'hidden', border: '1px solid rgba(0,0,0,0.15)'
            }}>
              <div style={{
                height: 34, background: 'linear-gradient(#fff6cf, #ffd876)',
                display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: '1px solid #e6c257',
                cursor: 'move', userSelect: 'none'
              }} onMouseDown={(e) => startDrag('notes', e)}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => setNotesOpen(false)} title="Fermer" style={{ width: 12, height: 12, background: '#ff5f57', borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer' }} />
                  <span style={{ width: 12, height: 12, background: '#ffbd2e', borderRadius: 999 }} />
                  <span style={{ width: 12, height: 12, background: '#28c840', borderRadius: 999 }} />
                </div>
                <div style={{ marginLeft: 10, fontSize: 12, fontWeight: 700 }}>Notes</div>
              </div>
              <div style={{ padding: 12, height: 'calc(100% - 34px)' }}>
                <textarea
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="Écrivez vos notes ici... (conservé tant que l'onglet reste ouvert)"
                  style={{
                    width: '100%', height: '100%', resize: 'none',
                    border: '1px solid #e5e7eb', borderRadius: 8, padding: 12,
                    outline: 'none', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                    fontSize: 14, background: '#fffdf6'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AeroportGame;


