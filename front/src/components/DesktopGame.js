import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const WS_BASE = 'ws://localhost:8000';

// Simple desktop icons metadata mapped to backend static /images/icons
const ICONS = [
  { id: 'folder', label: 'Dossier', file: 'folder_256x256x32.png', clickable: true },
  { id: 'mail', label: 'Mail', file: 'gmail_256x256x32.png', clickable: false },
  { id: 'calc', label: 'Calculatrice', file: 'calc 2_256x256x32.png', clickable: false },
  { id: 'clock', label: 'Horloge', file: 'clock 3_256x256x32.png', clickable: false },
  { id: 'trash', label: 'Corbeille', file: 'user-trash_256x256x32.png', clickable: false },
];

const DesktopGame = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState('http://localhost:8000/images/sky.png');
  const playerName = typeof window !== 'undefined'
    ? (localStorage.getItem('playerName') || 'Joueur')
    : 'Joueur';

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/${roomId}`);
    wsRef.current = ws;
    ws.onopen = () => {
      setIsConnected(true);
      try { ws.send(JSON.stringify({ type: 'set_name', name: playerName })); } catch {}
      // Ask server for desktop metadata (e.g., wallpaper in future)
      try { ws.send(JSON.stringify({ type: 'desktop_hello' })); } catch {}
    };
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'desktop_wallpaper' && data.url) {
          setWallpaper(data.url);
        }
      } catch {}
    };
    ws.onclose = () => setIsConnected(false);
    return () => { try { ws.close(); } catch {} };
  }, [roomId, playerName]);

  const handleIconClick = (icon) => {
    if (!icon.clickable) return;
    if (icon.id === 'folder') {
      setFolderOpen(true);
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
          <button onClick={() => navigate('/')} className="btn btn-secondary">Quitter</button>
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
            <div style={{fontWeight: 700}}></div>
            <div style={{marginLeft: 12, fontSize: 12, opacity: 0.85}}>Finder</div>
          </div>

          {/* Icons grid on desktop */}
          <div style={{
            position: 'absolute', top: 40, left: 16, display: 'grid',
            gridTemplateColumns: 'repeat(5, 88px)', gap: 14
          }}>
            {ICONS.map(icon => (
              <button
                key={icon.id}
                className="desktop-icon"
                onClick={() => handleIconClick(icon)}
                style={{
                  width: 88, height: 88, borderRadius: 12, background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', cursor: icon.clickable ? 'pointer' : 'default'
                }}
                disabled={!icon.clickable}
              >
                <img
                  src={`http://localhost:8000/images/icons/${icon.file}`}
                  alt={icon.label}
                  style={{ width: 48, height: 48, imageRendering: 'crisp-edges' }}
                />
                <div style={{ fontSize: 11, marginTop: 6, opacity: 0.9 }}>{icon.label}</div>
              </button>
            ))}
          </div>

          {/* Folder window */}
          {folderOpen && (
            <div style={{
              position: 'absolute', left: 140, top: 110, width: 420, height: 300,
              background: 'rgba(255,255,255,0.9)', borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)', color: '#111',
              overflow: 'hidden', border: '1px solid rgba(0,0,0,0.15)'
            }}>
              <div style={{
                height: 34, background: 'linear-gradient(#f4f4f6, #e8e8ee)',
                display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: '1px solid #d6d6df'
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ width: 12, height: 12, background: '#ff5f57', borderRadius: 999 }} />
                  <span style={{ width: 12, height: 12, background: '#ffbd2e', borderRadius: 999 }} />
                  <span style={{ width: 12, height: 12, background: '#28c840', borderRadius: 999 }} />
                </div>
                <div style={{ marginLeft: 10, fontSize: 12, fontWeight: 700 }}>Dossier</div>
                <button onClick={() => setFolderOpen(false)} style={{ marginLeft: 'auto', fontSize: 12, background: 'transparent', border: 'none', cursor: 'pointer' }}>Fermer</button>
              </div>
              <div style={{ padding: 16, fontSize: 13, color: '#333' }}>
                Ce dossier est vide pour l'instant. Nous y ajouterons des éléments cliquables ensuite.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopGame;


