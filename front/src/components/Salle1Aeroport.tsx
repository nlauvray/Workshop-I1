import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import photoIcon from '../assets/camera.png';
import gpsIcon from '../assets/radar.png';
import radioIcon from '../assets/walkie_talkie.png';
import mapIcon from '../assets/map.png';
import bgAeroport from '../assets/airport.jpg';

interface Salle1Props {
  session: { mode: 'create' | 'join'; code: string; pseudo: string };
  onNext: () => void;
}

const droneCode = 'D1234';
type PopupType = null | 'photo' | 'gps' | 'radio' | 'carte';

const LocationMarker: React.FC<{ coords: string; setCoords: (c: string) => void }> = ({ coords, setCoords }) => {
  const pos = coords
    ? (coords.split(',').map(Number) as [number, number])
    : null;

  const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
  });

  useMapEvents({
    click(e) {
      setCoords(`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
    },
  });

  return pos ? <Marker position={pos} icon={markerIcon} /> : null;
};

const MapWithMarker: React.FC<{
  center: [number, number],
  zoom: number,
  markerPos: [number, number] | null,
  onMapClick?: (lat: number, lng: number) => void
}> = ({ center, zoom, markerPos, onMapClick }) => {
  const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  });

  function LocationMarker() {
    useMapEvents({
      click(e) {
        if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });
    return markerPos ? <Marker position={markerPos} icon={markerIcon} /> : null;
  }

  return (
    <MapContainer center={center} zoom={zoom} style={{height: '100%', width: '100%'}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker />
    </MapContainer>
  );
};

const Salle1Aeroport: React.FC<Salle1Props> = ({ session, onNext }) => {
  const [popup, setPopup] = useState<PopupType>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [codeEntered, setCodeEntered] = useState('');
  const [gpsValidated, setGpsValidated] = useState(false);
  const [coords, setCoords] = useState('');

  // Gestion des popups
  const renderPopup = () => {
    const textStyle = { color: '#111' };

    switch (popup) {
      case 'photo':
        return (
          <div className="popup-obj" style={popupStyle}>
            <h3 style={textStyle}>Appareil photo</h3>
            <p style={textStyle}>
              Vous prenez une photo du ciel...<br />Drone détecté ! Code à transmettre : <b>{droneCode}</b>
            </p>
            <button onClick={() => { setPhotoTaken(true); setPopup(null); }}>Valider</button>
            <button onClick={() => setPopup(null)} style={{ marginLeft: 8 }}>Fermer</button>
          </div>
        );

      case 'gps':
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
                if (codeEntered === droneCode) setGpsValidated(true);
              }}
              disabled={gpsValidated || !photoTaken || !codeEntered}
            >
              Valider
            </button>
            {gpsValidated && <span style={{ color: 'green', marginLeft: 16 }}>Signal récupéré !</span>}
            <button onClick={() => setPopup(null)} style={{ marginLeft: 8 }}>Fermer</button>
          </div>
        );

      case 'radio':
        return (
          <div className="popup-obj" style={popupStyle}>
            <h3 style={textStyle}>Radio</h3>
            <p style={textStyle}>Permet de communiquer avec l'autre joueur (chat vocal à venir).</p>
            <button onClick={() => setPopup(null)}>Fermer</button>
          </div>
        );

      case 'carte':
        return (
          <div className="popup-obj" style={{ ...popupStyle, minWidth: '420px' }}>
            <h3 style={textStyle}>Carte interactive</h3>
            <p style={textStyle}>Cliquez sur la carte pour placer un point et lire ses coordonnées.</p>
            <div style={{ width: 360, height: 300, marginBottom: 16 }}>
              <MapWithMarker
                center={[48.8566, 2.3522]} // Example: Paris coordinates, adjust as needed
                zoom={13}
                markerPos={coords ? (coords.split(',').map(Number) as [number, number]) : null}
                onMapClick={(lat, lng) => setCoords(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)}
              />
            </div>
            {coords && <span style={{ color: 'green', marginBottom: 8 }}>Coordonnées : <b>{coords}</b></span>}
            <button onClick={() => setPopup(null)} style={{ marginLeft: 8 }}>Fermer</button>
          </div>
        );

      default:
        return null;
    }
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
      {/* Zone principale */}
      <div
        style={{
          flex: 2.5,
          padding: 32,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          background: 'rgba(255,255,255,0.80)',
          borderTopRightRadius: 32,
          borderBottomRightRadius: 32,
          boxShadow: '2px 0 16px #0002',
        }}
      >
        <h2>Bienvenue dans la Salle 1 : Aéroport</h2>
        <p>
          Session : {session.mode === 'create' ? 'Créateur' : 'Participant'} | Code : {session.code || '(auto)'} | Pseudo : {session.pseudo}
        </p>
        <div style={{ margin: '32px 0' }}>
          <b>Scène :</b> Deux photos de ciel, une avec le drone caché, l'autre non.<br />
          <span style={{ color: '#888' }}>Utilisez les objets de l'inventaire pour progresser.</span>
        </div>
        {coords && <button onClick={onNext} style={{ marginTop: 32 }}>Passer à la salle suivante</button>}
      </div>

      {/* Inventaire */}
      <div
        style={{
          width: 340,
          background: '#f5f5faee',
          padding: 24,
          boxShadow: '-2px 0 16px #0002',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          alignItems: 'center',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <h3>Inventaire</h3>
        <button style={objBtnStyle} onClick={() => setPopup('photo')} disabled={photoTaken} title="Appareil photo">
          <img src={photoIcon} alt="Appareil photo" style={imgBtnStyle} />
        </button>
        <button style={objBtnStyle} onClick={() => setPopup('gps')} disabled={!photoTaken} title="Appareil GPS">
          <img src={gpsIcon} alt="Appareil GPS" style={imgBtnStyle} />
        </button>
        <button style={objBtnStyle} onClick={() => setPopup('radio')} title="Radio">
          <img src={radioIcon} alt="Radio" style={imgBtnStyle} />
        </button>
        <button style={objBtnStyle} onClick={() => setPopup('carte')} disabled={!gpsValidated} title="Carte">
          <img src={mapIcon} alt="Carte" style={imgBtnStyle} />
        </button>
      </div>

      {popup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: '#0008', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {renderPopup()}
        </div>
      )}
    </div>
  );
};

// Styles
const objBtnStyle: React.CSSProperties = {
  padding: '16px',
  fontSize: '1.1em',
  borderRadius: '8px',
  border: '1px solid #bbb',
  background: '#fff',
  cursor: 'pointer',
  marginBottom: '8px',
  boxShadow: '0 2px 6px #0001',
  transition: 'background 0.2s',
};

const imgBtnStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  objectFit: 'contain',
  display: 'block',
  margin: '0 auto',
};

const popupStyle: React.CSSProperties = {
  background: '#fff',
  padding: '32px',
  borderRadius: '16px',
  minWidth: '320px',
  boxShadow: '0 8px 32px #0004',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export default Salle1Aeroport;
