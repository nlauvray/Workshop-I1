import React, { useEffect, useRef, useState } from 'react';
import { imageUrl } from '../config';
import { useParams } from 'react-router-dom';

// Assets served by backend static directory: /images/assets
const photoIcon = imageUrl('/images/assets/camera.png');
const gpsIcon = imageUrl('/images/assets/radar.png');
const radioIcon = imageUrl('/images/assets/walkie_talkie.png');
const mapIcon = imageUrl('/images/assets/map.png');
const bgAeroport = imageUrl('/images/assets/airport.png');

const droneCode = 'D1234';

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
  const [popup, setPopup] = useState(null); // 'photo' | 'gps' | 'radio' | 'carte' | null
  const [photoTaken, setPhotoTaken] = useState(false);
  const [codeEntered, setCodeEntered] = useState('');
  const [gpsValidated, setGpsValidated] = useState(false);
  const [coords, setCoords] = useState('');
  const [showGame, setShowGame] = useState(false);

  const openCameraGame = () => {
    setShowGame(true);
    setPopup('photo');
  };

  const renderPopup = () => {
    const textStyle = { color: '#111' };
    if (popup === 'photo') {
      return (
        <div className="popup-obj" style={popupStyle}>
          <h3 style={textStyle}>Appareil photo</h3>
          <p style={textStyle}>
            Vous prenez une photo du ciel...<br />Drone détecté ! Code à transmettre : <b>{droneCode}</b>
          </p>
          {showGame && roomId && (
            <div style={{ margin: '12px 0', width: 540, height: 560, borderRadius: 12, overflow: 'hidden', boxShadow: '0 6px 18px #0004' }}>
              <iframe
                title="Game"
                src={`${window.location.origin}/game/${roomId}?embed=1`}
                sandbox="allow-scripts allow-same-origin"
                style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setPhotoTaken(true); setPopup(null); }}>Valider</button>
            <button onClick={() => { setShowGame(false); setPopup(null); }}>Fermer</button>
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
            onClick={() => { if (codeEntered === droneCode) setGpsValidated(true); }}
            disabled={gpsValidated || !photoTaken || !codeEntered}
          >
            Valider
          </button>
          {gpsValidated && <span style={{ color: 'green', marginLeft: 16 }}>Signal récupéré !</span>}
          <button onClick={() => setPopup(null)} style={{ marginLeft: 8 }}>Fermer</button>
        </div>
      );
    }
    if (popup === 'radio') {
      return (
        <div className="popup-obj" style={popupStyle}>
          <h3 style={textStyle}>Radio</h3>
          <p style={textStyle}>Permet de communiquer avec l'autre joueur (chat vocal à venir).</p>
          <button onClick={() => setPopup(null)}>Fermer</button>
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
              onMapClick={(lat, lng) => setCoords(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)}
            />
          </div>
          {coords && <span style={{ color: 'green', marginBottom: 8 }}>Coordonnées : <b>{coords}</b></span>}
          <button onClick={() => setPopup(null)} style={{ marginLeft: 8 }}>Fermer</button>
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
        <h2>Bienvenue dans la Salle 1 : Aéroport</h2>
        <p>
          Session : {session.mode === 'create' ? 'Créateur' : 'Participant'} | Code : {roomId} | Pseudo : {playerName}
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
            <img src={photoIcon} alt="Appareil photo" style={imgBtnStyle} />
          </button>
          <button style={slotBtnStyle} onClick={() => setPopup('gps')} disabled={!photoTaken} title="Appareil GPS">
            <img src={gpsIcon} alt="Appareil GPS" style={imgBtnStyle} />
          </button>
          <button style={slotBtnStyle} onClick={() => setPopup('radio')} title="Radio">
            <img src={radioIcon} alt="Radio" style={imgBtnStyle} />
          </button>
          <button style={slotBtnStyle} onClick={() => setPopup('carte')} disabled={!gpsValidated} title="Carte">
            <img src={mapIcon} alt="Carte" style={imgBtnStyle} />
          </button>
        </div>
      </div>

      {popup && (
        <div
          onClick={() => setPopup(null)}
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

export default AeroportGame;


