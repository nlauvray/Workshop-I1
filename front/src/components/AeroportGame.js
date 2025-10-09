import React, { useEffect, useRef, useState } from 'react';
import { imageUrl } from '../config';
import { useParams } from 'react-router-dom';
import GameEmbed from './GameEmbed';
import OfficeGameEmbed from './OfficeGameEmbed';
import DesktopGameEmbed from './DesktopGameEmbed';
import PeerJSChat from './PeerJSChat';
import WalkieTalkieGlobal from './WalkieTalkieGlobal';
import { WalkieTalkieProvider, useWalkieTalkie } from '../contexts/WalkieTalkieContext';

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
  debugAeroport = () => {};
  debugUI = () => {};
}

const photoIcon = imageUrl('/images/assets/camera.png');
const gpsIcon = imageUrl('/images/assets/radar.png');
const radioIcon = imageUrl('/images/assets/walkie_talkie.png');
const mapIcon = imageUrl('/images/assets/map.png');
const bgAeroport = imageUrl('/images/assets/airport.png');
const audioDebutSalle1 = imageUrl('/images/assets/DebutMission.mp3');
const audioFinSalle1 = imageUrl('/images/assets/FinSalle1.mp3');

const droneCode = '10388';

// Coordonnées de Graz, Autriche avec marge de validation
const GRAZ_COORDS = {
  lat: 47.0707,
  lng: 15.4395
};
const VALIDATION_MARGIN = 0.5; // marge de ±0.5 degrés (environ 55km)

// Fonction pour vérifier si les coordonnées sont proches de Graz
const isNearGraz = (lat, lng) => {
  const latDiff = Math.abs(lat - GRAZ_COORDS.lat);
  const lngDiff = Math.abs(lng - GRAZ_COORDS.lng);
  return latDiff <= VALIDATION_MARGIN && lngDiff <= VALIDATION_MARGIN;
};

function LeafletMap({ center, zoom, markerPos, onMapClick, onMouseMove, onMousePixelMove }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ensureLeaflet = async () => {
      if (window.L && window.L.map) {
        setReady(true);
        return;
      }
      await new Promise((resolve) => {
        if (!document.getElementById('leaflet-css-cdn')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css-cdn';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
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
      mapRef.current = L.map(containerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: false
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
      
      mapRef.current.on('click', (e) => {
        if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
      });
      
      mapRef.current.on('mousemove', (e) => {
        if (onMouseMove) onMouseMove(e.latlng.lat, e.latlng.lng);
        if (onMousePixelMove) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const pixelX = e.containerPoint.x;
          const pixelY = e.containerPoint.y;
          onMousePixelMove(pixelX, pixelY, containerRect.width, containerRect.height);
        }
      });
    }
  }, [ready, center, zoom, onMapClick, onMouseMove, onMousePixelMove]);

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

const AeroportGameContent = ({ session = { mode: 'create', code: '', pseudo: 'Joueur' }, onNext = () => {} }) => {
  const { roomId } = useParams();
  const playerName = typeof window !== 'undefined' ? (localStorage.getItem('playerName') || 'Joueur') : 'Joueur';
  
  const [popup, setPopup] = useState(null); 
  const [photoTaken, setPhotoTaken] = useState(false);
  const [codeEntered, setCodeEntered] = useState('');
  const [gpsValidated, setGpsValidated] = useState(false);
  const [coords, setCoords] = useState(null);
  const [mouseCoords, setMouseCoords] = useState(null);
  const [mousePixelPosition, setMousePixelPosition] = useState(null);
  const [coordsValidated, setCoordsValidated] = useState(false);
  const [validationMessage, setValidationMessage] = useState(null);
  const [showGame, setShowGame] = useState(false);
  const [droneFound, setDroneFound] = useState(false); 
  const [showOfficeGame, setShowOfficeGame] = useState(false); 
  const [showDesktopGame, setShowDesktopGame] = useState(false); 
  const [chatStarted, setChatStarted] = useState(false); 
  const { openWalkieTalkie } = useWalkieTalkie();

  useEffect(() => {
    debugAeroport('Component initialized', {
      roomId,
      playerName,
      session,
      debugMode: DEBUG_MODE
    });
  }, [roomId, playerName, session]);

  // Audio au lancement
  useEffect(() => {
    try {
      const a = new Audio(audioDebutSalle1);
      a.volume = 1.0;
      a.play().catch(() => {});
    } catch {}
  }, []);

  // Charger PeerJS
  useEffect(() => {
    const loadPeerJS = async () => {
      if (window.Peer) {
        debugAeroport('PeerJS already loaded');
        return;
      }

      try {
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

  // CSS animations
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
                  setDroneFound(true);
                }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPopup(null)}>Fermer</button>
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
                  const a = new Audio(audioFinSalle1);
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
          {gpsValidated && <span style={{ color: 'green', marginLeft: 16 }}>Coordonnées trouvé dans l'Europe, autour de Graz.</span>}
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
            setChatStarted(false);
          }}>Fermer</button>
        </div>
      );
    }
   
    if (popup === 'carte') {
      const mapBounds = {
        latMin: 35,
        latMax: 71,
        lngMin: -10,
        lngMax: 40
      };

      // Utiliser coords pour le point placé
      const currentLat = coords ? coords.lat : null;
      const currentLng = coords ? coords.lng : null;
      
      // Les indicateurs du curseur sont maintenant gérés par mousePixelPosition
      
      return (
        <div className="popup-obj" style={{ ...popupStyle, minWidth: '600px', maxWidth: '80vw' }}>
          <h3 style={textStyle}>Carte interactive</h3>
          <p style={{...textStyle, fontSize: '14px', marginBottom: '12px'}}>Cliquez sur la carte pour placer un point.</p>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Échelle latitude */}
            <div style={{ 
              width: 50, 
              height: 350, 
              background: 'linear-gradient(180deg, #2c3e50, #34495e)',
              border: '3px solid #1a252f',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '8px 4px',
              fontSize: 10,
              fontWeight: 'bold',
              color: '#ecf0f1',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <div style={{ textAlign: 'center', padding: '4px 0' }}>71°N</div>
              <div style={{ textAlign: 'center', padding: '4px 0' }}>53°N</div>
              <div style={{ textAlign: 'center', padding: '4px 0' }}>35°N</div>
              
              {/* Indicateur du curseur */}
              {mousePixelPosition && (
                <div style={{
                  position: 'absolute',
                  right: -12,
                  top: `${mousePixelPosition.y}px`,
                  width: 20,
                  height: 20,
                  background: '#3498db',
                  border: '3px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 2px 12px rgba(52, 152, 219, 0.8)',
                  transform: 'translateY(-50%)',
                  zIndex: 10
                }} />
              )}
            </div>

            {/* Carte avec curseur en croix */}
            <div style={{ position: 'relative' }}>
              <div style={{ 
                width: 500, 
                height: 350, 
                marginBottom: 16, 
                position: 'relative',
                border: '3px solid #1a252f',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 6px 20px rgba(0,0,0,0.4)'
              }}>
                <LeafletMap
                  center={[50, 15]}
                  zoom={4}
                  markerPos={coords ? [coords.lat, coords.lng] : null}
                  onMapClick={(lat, lng) => {
                    debugAeroport('Map coordinates selected', {
                      lat: lat.toFixed(5),
                      lng: lng.toFixed(5),
                      roomId,
                      playerName
                    });
                    setCoords({ lat, lng });
                    // Effacer le message de validation précédent
                    setValidationMessage(null);
                  }}
                  onMouseMove={(lat, lng) => {
                    setMouseCoords({ lat, lng });
                  }}
                  onMousePixelMove={(pixelX, pixelY, containerWidth, containerHeight) => {
                    setMousePixelPosition({
                      x: pixelX,
                      y: pixelY,
                      width: containerWidth,
                      height: containerHeight
                    });
                  }}
                />
                
                {/* Lignes du curseur qui suivent la souris */}
                {mousePixelPosition && (
                  <>
                    {/* Ligne horizontale du curseur */}
                    <div style={{
                      position: 'absolute',
                      top: `${mousePixelPosition.y}px`,
                      left: 0,
                      width: '100%',
                      height: 2,
                      background: 'rgba(52, 152, 219, 0.7)',
                      pointerEvents: 'none',
                      zIndex: 999,
                      boxShadow: '0 0 6px rgba(52, 152, 219, 0.8)'
                    }} />
                    
                    {/* Ligne verticale du curseur */}
                    <div style={{
                      position: 'absolute',
                      left: `${mousePixelPosition.x}px`,
                      top: 0,
                      width: 2,
                      height: '100%',
                      background: 'rgba(52, 152, 219, 0.7)',
                      pointerEvents: 'none',
                      zIndex: 999,
                      boxShadow: '0 0 6px rgba(52, 152, 219, 0.8)'
                    }} />
                    
                    {/* Point de croisement */}
                    <div style={{
                      position: 'absolute',
                      left: `${mousePixelPosition.x - 6}px`,
                      top: `${mousePixelPosition.y - 6}px`,
                      width: 12,
                      height: 12,
                      background: 'rgba(52, 152, 219, 0.9)',
                      border: '2px solid white',
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 0 8px rgba(52, 152, 219, 1)'
                    }} />
                  </>
                )}
              </div>
              
              {/* Échelle longitude */}
              <div style={{ 
                width: 500, 
                height: 40, 
                background: 'linear-gradient(90deg, #2c3e50, #34495e)',
                border: '3px solid #1a252f',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 'bold',
                color: '#ecf0f1',
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <div style={{ padding: '4px 0' }}>10°O</div>
                <div style={{ padding: '4px 0' }}>15°E</div>
                <div style={{ padding: '4px 0' }}>40°E</div>
                
                {/* Indicateur du curseur */}
                {mousePixelPosition && (
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    left: `${mousePixelPosition.x}px`,
                    width: 20,
                    height: 20,
                    background: '#3498db',
                    border: '3px solid white',
                    borderRadius: '50%',
                    boxShadow: '0 2px 12px rgba(52, 152, 219, 0.8)',
                    transform: 'translateX(-50%)',
                    zIndex: 10
                  }} />
                )}
              </div>
            </div>
          </div>
          
          {/* Affichage des coordonnées du curseur */}
          {mouseCoords && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <span style={{ color: '#3498db', fontSize: 12 }}>
                Curseur : {mouseCoords.lat.toFixed(5)}° | {mouseCoords.lng.toFixed(5)}°
              </span>
            </div>
          )}
          
          {/* Validation des coordonnées */}
          {coords && !coordsValidated && (
            <div style={{ marginTop: 12, marginBottom: 8, textAlign: 'center' }}>
              <div style={{ 
                background: '#ecf0f1', 
                padding: '8px 16px', 
                borderRadius: 8, 
                marginBottom: 8,
                border: '2px solid #bdc3c7'
              }}>
                <span style={{ color: '#2c3e50', fontSize: 13, fontWeight: 'bold' }}>
                  Point placé : {coords.lat.toFixed(5)}° | {coords.lng.toFixed(5)}°
                </span>
              </div>
              <button 
                onClick={() => {
                  debugAeroport('Coordinates validation attempt', { 
                    coords, 
                    roomId, 
                    playerName,
                    isNearGraz: isNearGraz(coords.lat, coords.lng)
                  });
                  
                  if (isNearGraz(coords.lat, coords.lng)) {
                    // Coordonnées valides - proche de Graz
                    setCoordsValidated(true);
                    setValidationMessage({ type: 'success', text: '✓ Coordonnées validées ! Graz, Autriche détectée.' });
                    setPopup(null);
                    
                    // Jouer l'audio de fin de salle 1
                    try {
                      const audio = new Audio(audioFinSalle1);
                      audio.volume = 1.0;
                      audio.play().catch(() => {});
                    } catch (error) {
                      console.error('Erreur lors de la lecture audio:', error);
                    }
                  } else {
                    // Coordonnées invalides - pas proche de Graz
                    setValidationMessage({ 
                      type: 'error', 
                      text: '❌ Ville incorrecte. Veuillez cliquer sur Graz, en Autriche.' 
                    });
                  }
                }} 
                style={{ 
                  backgroundColor: '#27ae60',
                  color: 'white',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(39, 174, 96, 0.4)',
                  transition: 'all 0.3s ease'
                }}
              >
                ✓ Valider ces coordonnées
              </button>
              
              {/* Message de validation */}
              {validationMessage && (
                <div style={{ 
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  textAlign: 'center',
                  backgroundColor: validationMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                  border: `2px solid ${validationMessage.type === 'success' ? '#28a745' : '#dc3545'}`,
                  color: validationMessage.type === 'success' ? '#155724' : '#721c24'
                }}>
                  <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                    {validationMessage.text}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {coordsValidated && (
            <div style={{ 
              marginTop: 12, 
              padding: '12px', 
              background: '#d4edda', 
              border: '2px solid #28a745',
              borderRadius: 6,
              textAlign: 'center'
            }}>
              <span style={{ color: '#155724', fontSize: 14, fontWeight: 'bold' }}>
                ✓ Coordonnées validées ! Vous pouvez passer à la salle suivante.
              </span>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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

  if (showDesktopGame) {
    return <DesktopGameEmbed roomId={roomId} playerName={playerName} onBack={() => setShowDesktopGame(false)} />;
  }

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
        }}
      >
        <h2>🎮 ESCAPE TECH - Mission IA Dysfonctionnelle</h2>
        <p>
          <strong>Salle 1 : Aéroport</strong> | Session : {session.mode === 'create' ? 'Créateur' : 'Participant'} | Code : {roomId} | Pseudo : {playerName}
        </p>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '8px' }}>
          Coopération obligatoire - 2 joueurs requis pour cette mission
        </p>
        
        {coordsValidated && (
          <div style={{ 
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <button 
              onClick={() => setShowOfficeGame(true)}  
              style={{ 
                padding: '20px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 16,
                cursor: 'pointer',
                boxShadow: '0 12px 30px rgba(16, 185, 129, 0.5), 0 4px 15px rgba(5, 150, 105, 0.3)',
                transition: 'all 0.3s ease',
                minWidth: '280px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 35px rgba(16, 185, 129, 0.6), 0 6px 20px rgba(5, 150, 105, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 12px 30px rgba(16, 185, 129, 0.5), 0 4px 15px rgba(5, 150, 105, 0.3)';
              }}
            >
              ➤ CONTINUER
            </button>
          </div>
        )}
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
            debugUI('Walkie-talkie popup opened', { roomId, playerName });
            openWalkieTalkie(roomId, playerName);
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

const AeroportGame = ({ session = { mode: 'create', code: '', pseudo: 'Joueur' }, onNext = () => {} }) => {
  return (
    <WalkieTalkieProvider>
      <AeroportGameContent session={session} onNext={onNext} />
      <WalkieTalkieGlobal />
    </WalkieTalkieProvider>
  );
};

export default AeroportGame;