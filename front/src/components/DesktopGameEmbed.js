import React, { useEffect, useState } from 'react';
import { imageUrl } from '../config';

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
            <div style={{fontWeight: 700, fontFamily: 'SF Pro, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', fontSize: 20, lineHeight: '28px'}}>
              &#63743;
            </div>
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

export default DesktopGameEmbed;
