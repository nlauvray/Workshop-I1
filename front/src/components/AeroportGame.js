import React, { useEffect, useRef, useState } from 'react';
import { imageUrl } from '../config';
import { useParams } from 'react-router-dom';
import GameEmbed from './GameEmbed';
import OfficeGameEmbed from './OfficeGameEmbed';
import DesktopGameEmbed from './DesktopGameEmbed';
import PeerJSChat from './PeerJSChat';

const DEBUG_MODE = process.env.REACT_APP_DEBUG_MODE === 'true';

let debugAeroport, debugUI;

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
  debugUI = (message, data = null) => debugLog('UI', message, data);
} else {
  // No-op functions when debug is disabled
  debugAeroport = () => {};
  debugUI = () => {};
}

// Assets served by backend static directory: /images/assets
const photoIcon = imageUrl('/images/assets/camera.png');
const gpsIcon = imageUrl('/images/assets/radar.png');
const radioIcon = imageUrl('/images/assets/walkie_talkie.png');
const mapIcon = imageUrl('/images/assets/map.png');
const bgAeroport = imageUrl('/images/assets/airport.png');
const audioDebutMission = { 
  secure: [
    { src: '/assets/DebutMission.mp3', title: 'Début de mission', speaker: 'Système' },
  ] 
};
const audioFinSalle1 = { 
  secure: [
    { src: '/assets/FinSalle1.mp3', title: 'Fin Salle 1', speaker: 'Fin' },
  ] 
};


const droneCode = '10388';

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
  const [chatStarted, setChatStarted] = useState(false); // État pour démarrer le chat vocal

  // Debug: Log component initialization
  useEffect(() => {
    debugAeroport('Component initialized', {
      roomId,
      playerName,
      session,
      debugMode: DEBUG_MODE
    });
  }, [roomId, playerName, session]);

  // Lecture auto au lancement de la salle 1
  useEffect(() => {
    try {
      const a = new Audio(audioDebutMission.secure[0].src);
      a.volume = 1.0;
      a.play().catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    const loadPeerJS = async () => {
      if (window.Peer) {
        debugAeroport('PeerJS already loaded');
        return;
      }

      try {
        // Load PeerJS from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            debugAeroport('PeerJS loaded successfully');
            resolve();
          };
          script.onerror = () => {
            debugAeroport('Failed to load PeerJS');
            reject(new Error('Failed to load PeerJS'));
          };
          document.head.appendChild(script);
        });
      } catch (error) {
        debugAeroport('Error loading PeerJS', error);
      }
    };

    loadPeerJS();
  }, []);

  // Add CSS animations
  useEffect(() => {
    const styleId = 'aeroport-game-animations';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes popupSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

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
            try {
              const a = new Audio(audioFinSalle1.secure[0].src);
              a.volume = 1.0;
              a.play().catch(() => {});
            } catch {}
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
          <h3 style={textStyle}>Walkie-Talkie Vocal</h3>
          <div style={{ marginBottom: '16px' }}>
            {!chatStarted && (
              <button 
                onClick={() => {
                  debugUI('Chat started', { chatStarted, roomId, playerName });
                  setChatStarted(true);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease'
                }}
              >
                📻 Démarrer le chat
              </button>
            )}
          </div>
          
          {chatStarted && (
            <div style={{ 
              width: '100%', 
              marginBottom: '16px',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              <PeerJSChat roomId={roomId} playerName={playerName} />
            </div>
          )}
          
          {!chatStarted && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              Cliquez sur "Démarrer le chat" pour activer le walkie-talkie vocal
            </div>
          )}
          
          <button onClick={() => {
            debugUI('Radio popup closed');
            setPopup(null);
            setChatStarted(false); // Arrêter le chat en fermant la popup
          }}>Fermer</button>
        </div>
      );
    }
   
    if (popup === 'carte') {
      const marker = coords ? coords.split(',').map(Number) : null;
      const currentLat = marker ? marker[0] : null;
      const currentLng = marker ? marker[1] : null;
      
      return (
        <div className="popup-obj" style={{ ...popupStyle, minWidth: '900px', maxWidth: '95vw' }}>
          <h3 style={textStyle}>Carte interactive</h3>
          <p style={textStyle}>Cliquez sur la carte pour placer un point et lire ses coordonnées.</p>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Barre de latitude à gauche */}
            <div style={{ 
              width: 60, 
              height: 500, 
              background: 'linear-gradient(180deg, #f0f0f0, #e0e0e0)',
              border: '2px solid #999',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '8px 4px',
              fontSize: 11,
              fontWeight: 'bold',
              color: '#333',
              position: 'relative'
            }}>
              <div style={{ textAlign: 'center' }}>48.90°N</div>
              <div style={{ textAlign: 'center' }}>48.85°N</div>
              <div style={{ textAlign: 'center' }}>48.80°N</div>
              
              {/* Indicateur de latitude actuelle */}
              {currentLat && (
                <div style={{
                  position: 'absolute',
                  right: -8,
                  top: `${((48.90 - currentLat) / (48.90 - 48.80)) * 100}%`,
                  width: 16,
                  height: 16,
                  background: 'red',
                  border: '2px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  transform: 'translateY(-50%)'
                }} />
              )}
            </div>

            {/* Carte principale */}
            <div style={{ position: 'relative' }}>
              <div style={{ width: 700, height: 500, marginBottom: 16, position: 'relative' }}>
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
                
                {/* Lignes de croisement (crosshair) */}
                {marker && (
                  <>
                    {/* Ligne horizontale */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      width: '100%',
                      height: 2,
                      background: 'rgba(255, 0, 0, 0.6)',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                    }} />
                    
                    {/* Ligne verticale */}
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      width: 2,
                      height: '100%',
                      background: 'rgba(255, 0, 0, 0.6)',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                    }} />
                  </>
                )}
              </div>
              
              {/* Barre de longitude en bas */}
              <div style={{ 
                width: 700, 
                height: 50, 
                background: 'linear-gradient(90deg, #f0f0f0, #e0e0e0)',
                border: '2px solid #999',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#333',
                position: 'relative'
              }}>
                <div>2.30°E</div>
                <div>2.35°E</div>
                <div>2.40°E</div>
                
                {/* Indicateur de longitude actuelle */}
                {currentLng && (
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    left: `${((currentLng - 2.30) / (2.40 - 2.30)) * 100}%`,
                    width: 16,
                    height: 16,
                    background: 'red',
                    border: '2px solid white',
                    borderRadius: '50%',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transform: 'translateX(-50%)'
                  }} />
                )}
              </div>
            </div>
          </div>
          
          {coords && (
            <div style={{ marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
              <span style={{ color: 'green', fontSize: 16 }}>Coordonnées : <b>{coords}</b></span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {coords && (
              <button 
                onClick={() => {
                  debugAeroport('Coordinates validated', { coords, roomId, playerName });
                  alert('Coordonnées validées ! Vous pouvez maintenant passer à la salle suivante.');
                  setPopup(null);
                }} 
                style={{ 
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '8px 16px',
                  fontWeight: 'bold'
                }}
              >
                Valider les coordonnées
              </button>
            )}
            <button onClick={() => {
              debugUI('Map popup closed');
              setPopup(null);
            }}>Fermer</button>
          </div>
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
  animation: 'popupSlideIn 0.3s ease-out',
};

export default AeroportGame;